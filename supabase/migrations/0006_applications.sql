-- F2/F3: short application without account, knockout questions, mail queue.

-- Consent to processing for this application (required) with the text version shown.
alter table public.applications
  add column processing_consent_at timestamptz,
  add column consent_version text,
  add column knockout_reasons jsonb not null default '[]'::jsonb;

-- CVs: at most 10 MB per file (the server also checks the content type by its bytes).
update storage.buckets set file_size_limit = 10485760 where id = 'cvs';

-- Applicant e-mail is matched case-insensitively to avoid duplicate candidates.
create index candidates_email_idx on public.candidates (lower(email));

-- Outgoing e-mails. Written by the server (service role), sent by /api/cron/mail
-- once an SMTP provider is configured. Keeps personal data minimal: the
-- recipient address and template variables, deleted with the application.
create table public.mail_outbox (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  to_email text not null,
  template text not null check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question')),
  data jsonb not null default '{}'::jsonb,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index mail_outbox_due_idx on public.mail_outbox (send_after) where sent_at is null and cancelled_at is null;
create index mail_outbox_application_idx on public.mail_outbox (application_id);
alter table public.mail_outbox enable row level security;
create policy staff_read on public.mail_outbox for select to authenticated using (private.is_staff());
-- Staff may cancel a queued mail (e.g. a delayed rejection), nothing else.
create policy staff_update on public.mail_outbox for update to authenticated using (private.is_staff()) with check (private.is_staff());

-- Used by the mail job (service role only) to claim due mails without double sending.
-- In the public schema so the server can call it via the API; nobody else may execute it.
create or replace function public.claim_due_mails(max_count int) returns setof public.mail_outbox
language sql security definer set search_path = public as $$
  update public.mail_outbox m set attempts = m.attempts + 1
  where m.id in (
    select id from public.mail_outbox
    where sent_at is null and cancelled_at is null and send_after <= now() and attempts < 5
    order by send_after
    limit max_count
    for update skip locked
  )
  returning m.*;
$$;
revoke execute on function public.claim_due_mails(int) from public, anon, authenticated;
grant execute on function public.claim_due_mails(int) to service_role;

-- Stores a complete application atomically (candidate, application, answers,
-- attribution, events, queued mails). Called by the server with the service
-- role after validating the form and evaluating the knockout questions.
create or replace function public.submit_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vacancies;
  cand_id uuid;
  app_id uuid;
  v_email text := nullif(lower(btrim(p ->> 'email')), '');
  v_phone text := nullif(btrim(p ->> 'phone'), '');
  v_status public.application_status := (p ->> 'status')::public.application_status;
  a jsonb;
  m jsonb;
begin
  select * into v from public.vacancies x where x.id = (p ->> 'vacancy_id')::uuid and x.status = 'active' for share;
  if not found then
    raise exception 'vacancy_not_active' using errcode = 'P0001';
  end if;
  if v_status not in ('screening', 'knockout_failed') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'contact_required' using errcode = 'P0001';
  end if;

  -- Reuse the candidate with the same e-mail (or, without e-mail, the same phone).
  if v_email is not null then
    select id into cand_id from public.candidates where lower(candidates.email) = v_email order by created_at limit 1;
  else
    select id into cand_id from public.candidates where candidates.phone = v_phone and candidates.email is null order by created_at limit 1;
  end if;

  if cand_id is null then
    insert into public.candidates (first_name, last_name, email, phone)
    values (left(p ->> 'first_name', 80), left(p ->> 'last_name', 80), v_email, v_phone)
    returning id into cand_id;
  else
    update public.candidates set
      first_name = left(p ->> 'first_name', 80),
      last_name = left(p ->> 'last_name', 80),
      phone = coalesce(v_phone, candidates.phone)
    where id = cand_id;
  end if;

  if coalesce((p ->> 'talent_pool')::boolean, false) then
    update public.candidates set talent_pool_consent_at = coalesce(talent_pool_consent_at, now()) where id = cand_id;
  end if;

  if exists (select 1 from public.applications where vacancy_id = v.id and candidate_id = cand_id) then
    raise exception 'duplicate_application' using errcode = 'P0001';
  end if;

  insert into public.applications (vacancy_id, candidate_id, status, processing_consent_at, consent_version, knockout_reasons, closed_at)
  values (v.id, cand_id, v_status, now(), p ->> 'consent_version', coalesce(p -> 'knockout_reasons', '[]'::jsonb),
          case when v_status = 'knockout_failed' then now() end)
  returning id into app_id;

  for a in select * from jsonb_array_elements(coalesce(p -> 'answers', '[]'::jsonb)) loop
    insert into public.screening_answers (application_id, question_id, answer)
    select app_id, q.id, a -> 'answer'
    from public.screening_questions q
    where q.id = (a ->> 'question_id')::uuid and q.vacancy_id = v.id;
  end loop;

  insert into public.application_attribution (application_id, entry_point, channel, utm_source, utm_medium, utm_campaign, utm_content)
  values (app_id, coalesce((p ->> 'entry_point')::public.entry_point, 'jobboard'), p ->> 'channel',
          left(p ->> 'utm_source', 100), left(p ->> 'utm_medium', 100), left(p ->> 'utm_campaign', 100), left(p ->> 'utm_content', 100));

  insert into public.events (name, organization_id, vacancy_id, application_id, entry_point, channel, event_id)
  values ('apply_submit', v.organization_id, v.id, app_id, coalesce((p ->> 'entry_point')::public.entry_point, 'jobboard'), p ->> 'channel', 'apply_submit:' || app_id);
  if v_status = 'screening' then
    insert into public.events (name, organization_id, vacancy_id, application_id, entry_point, channel, event_id)
    values ('knockout_passed', v.organization_id, v.id, app_id, coalesce((p ->> 'entry_point')::public.entry_point, 'jobboard'), p ->> 'channel', 'knockout_passed:' || app_id);
  end if;

  if v_email is not null then
    for m in select * from jsonb_array_elements(coalesce(p -> 'mails', '[]'::jsonb)) loop
      insert into public.mail_outbox (application_id, to_email, template, data, send_after)
      values (app_id, v_email, m ->> 'template', coalesce(m -> 'data', '{}'::jsonb), coalesce((m ->> 'send_after')::timestamptz, now()));
    end loop;
  end if;

  return jsonb_build_object('application_id', app_id, 'candidate_id', cand_id);
end;
$$;
revoke execute on function public.submit_application(jsonb) from public, anon, authenticated;
grant execute on function public.submit_application(jsonb) to service_role;
