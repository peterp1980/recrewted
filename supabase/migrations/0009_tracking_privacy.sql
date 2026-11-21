-- F12 attribution and conversions, F20 consent and retention, data subject requests.

-- New mail template for data subject requests (Auskunft/Löschung).
alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request'));
-- Data request mails have no application.
alter table public.mail_outbox add column candidate_id uuid references public.candidates (id) on delete cascade;

-- Marketing consent at the time of the application decides whether conversions may be sent.
alter table public.application_attribution add column marketing_consent boolean not null default false;

-- One row per event and platform that was (or could not be) reported.
create table public.conversion_log (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google', 'tiktok', 'linkedin')),
  status text not null check (status in ('sent', 'failed', 'not_configured', 'skipped')),
  detail text,
  created_at timestamptz not null default now(),
  unique (event_id, platform)
);
alter table public.conversion_log enable row level security;
create policy staff_read on public.conversion_log for select to authenticated using (private.is_staff());

create index events_name_time_idx on public.events (name, occurred_at);

-- submit_application (0006) now also stores click IDs (marketing consent only) and the campaign.
create or replace function public.submit_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.vacancies;
  cand_id uuid;
  app_id uuid;
  camp public.campaigns;
  v_email text := nullif(lower(btrim(p ->> 'email')), '');
  v_phone text := nullif(btrim(p ->> 'phone'), '');
  v_status public.application_status := (p ->> 'status')::public.application_status;
  v_marketing boolean := coalesce((p ->> 'marketing_consent')::boolean, false);
  v_entry public.entry_point := coalesce((p ->> 'entry_point')::public.entry_point, 'jobboard');
  v_click_type text := case when v_marketing and p ->> 'click_id_type' in ('gclid', 'wbraid', 'gbraid', 'fbclid', 'ttclid', 'li_fat_id') then p ->> 'click_id_type' end;
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

  -- Campaign of this vacancy whose utm_campaign matches (F7 tracking links).
  select * into camp from public.campaigns c where c.vacancy_id = v.id and c.utm_campaign = p ->> 'utm_campaign' limit 1;

  insert into public.application_attribution (application_id, entry_point, channel, campaign_id, ad_account_owner,
    utm_source, utm_medium, utm_campaign, utm_content, click_id_type, click_id, click_id_expires_at, marketing_consent)
  values (app_id, v_entry, coalesce(camp.channel, left(p ->> 'utm_source', 100)), camp.id,
          (select owner from public.ad_accounts where id = camp.ad_account_id),
          left(p ->> 'utm_source', 100), left(p ->> 'utm_medium', 100), left(p ->> 'utm_campaign', 100), left(p ->> 'utm_content', 100),
          v_click_type, case when v_click_type is not null then left(p ->> 'click_id', 500) end,
          case when v_click_type is not null then now() + interval '90 days' end, v_marketing);

  insert into public.events (name, organization_id, vacancy_id, campaign_id, application_id, ad_account_owner, entry_point, channel, event_id)
  select 'apply_submit', v.organization_id, v.id, att.campaign_id, app_id, att.ad_account_owner, att.entry_point, att.channel, 'apply_submit:' || app_id
  from public.application_attribution att where att.application_id = app_id;
  if v_status = 'screening' then
    insert into public.events (name, organization_id, vacancy_id, campaign_id, application_id, ad_account_owner, entry_point, channel, event_id)
    select 'knockout_passed', v.organization_id, v.id, att.campaign_id, app_id, att.ad_account_owner, att.entry_point, att.channel, 'knockout_passed:' || app_id
    from public.application_attribution att where att.application_id = app_id;
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

-- F20 retention. Deadlines are parameters so they can follow the DPO's final decision.
-- Returns the CV paths of deleted applications so the job can remove the files.
create or replace function public.run_retention(
  application_months int default 6,
  click_id_days int default 90,
  event_months int default 26,
  mail_days int default 90
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cvs text[];
  n_apps int;
  n_cands int;
  n_clicks int;
  n_events int;
  n_mails int;
begin
  select coalesce(array_agg(cv_storage_path) filter (where cv_storage_path is not null), '{}') into cvs
  from public.applications
  where closed_at is not null and closed_at < now() - make_interval(months => application_months);

  delete from public.applications
  where closed_at is not null and closed_at < now() - make_interval(months => application_months);
  get diagnostics n_apps = row_count;

  -- Candidates without applications and without talent pool consent are deleted too.
  delete from public.candidates c
  where c.talent_pool_consent_at is null
    and not exists (select 1 from public.applications a where a.candidate_id = c.id);
  get diagnostics n_cands = row_count;

  update public.application_attribution att
  set click_id = null, click_id_type = null, click_id_expires_at = null
  from public.applications a
  where a.id = att.application_id
    and att.click_id is not null
    and (att.click_id_expires_at <= now() or a.submitted_at < now() - make_interval(days => click_id_days));
  get diagnostics n_clicks = row_count;

  delete from public.events where occurred_at < now() - make_interval(months => event_months);
  get diagnostics n_events = row_count;

  delete from public.mail_outbox where coalesce(sent_at, cancelled_at) < now() - make_interval(days => mail_days);
  get diagnostics n_mails = row_count;

  insert into public.audit_log (action, table_name, details)
  values ('retention', 'applications', jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails));

  return jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails, 'cv_paths', to_jsonb(cvs));
end;
$$;
revoke execute on function public.run_retention(int, int, int, int) from public, anon, authenticated;
grant execute on function public.run_retention(int, int, int, int) to service_role;

-- Data subject request: everything stored about one candidate (Auskunft), and deletion.
create or replace function public.candidate_export(cand uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'candidate', (select to_jsonb(c) - 'id' from public.candidates c where c.id = cand),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'job', v.title,
        'submitted_at', a.submitted_at,
        'status', a.status,
        'consent_version', a.consent_version,
        'answers', (select jsonb_agg(jsonb_build_object('question', q.question, 'answer', sa.answer))
                    from public.screening_answers sa join public.screening_questions q on q.id = sa.question_id where sa.application_id = a.id),
        'ratings', (select jsonb_agg(jsonb_build_object('criterion', sc.name, 'rating', r.rating, 'reason', r.reason))
                    from public.scorecard_ratings r join public.scorecard_criteria sc on sc.id = r.criterion_id where r.application_id = a.id),
        'customer_feedback', (select jsonb_agg(jsonb_build_object('verdict', f.verdict, 'reason', f.reason, 'at', f.created_at))
                    from public.customer_feedback f where f.application_id = a.id),
        'origin', (select jsonb_build_object('entry_point', att.entry_point, 'utm_source', att.utm_source, 'utm_medium', att.utm_medium, 'utm_campaign', att.utm_campaign)
                    from public.application_attribution att where att.application_id = a.id),
        'cv_uploaded', a.cv_storage_path is not null
      ))
      from public.applications a join public.vacancies v on v.id = a.vacancy_id where a.candidate_id = cand
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.candidate_export(uuid) from public, anon, authenticated;
grant execute on function public.candidate_export(uuid) to service_role;
