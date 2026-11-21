-- 1) Interview scheduling: free slots per vacancy, candidates book via personal link.
-- 2) WhatsApp: opt-in per candidate, template messages alongside the e-mails (mail stays the fallback).

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report', 'pool_invite',
                      'team_mention', 'team_shortlist', 'vacancy_request',
                      'booking_invite', 'interview_booked', 'interview_cancelled', 'interview_reminder', 'team_booking'));

-- ---------------------------------------------------------------
-- 1) Scheduling
-- ---------------------------------------------------------------
create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes int not null default 30 check (duration_minutes between 10 and 480),
  mode text not null default 'onsite' check (mode in ('onsite', 'video', 'phone')),
  -- Address, video link or "we call you"; shown to the candidate after booking.
  location text check (location is null or char_length(location) <= 500),
  note text check (note is null or char_length(note) <= 1000),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index interview_slots_vacancy_idx on public.interview_slots (vacancy_id, starts_at) where cancelled_at is null;
alter table public.interview_slots enable row level security;
create policy staff_all on public.interview_slots for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.interview_slots for select to authenticated using (private.can_see_vacancy(vacancy_id));
create policy member_insert on public.interview_slots for insert to authenticated
  with check (exists (select 1 from public.vacancies v where v.id = vacancy_id and private.can_edit_org(v.organization_id)));
create policy member_update on public.interview_slots for update to authenticated
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and private.can_edit_org(v.organization_id)))
  with check (exists (select 1 from public.vacancies v where v.id = vacancy_id and private.can_edit_org(v.organization_id)));

create table public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.interview_slots (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('candidate', 'team')),
  reminder_sent_at timestamptz
);
create unique index interview_bookings_slot_active on public.interview_bookings (slot_id) where cancelled_at is null;
create unique index interview_bookings_app_active on public.interview_bookings (application_id) where cancelled_at is null;
alter table public.interview_bookings enable row level security;
create policy staff_all on public.interview_bookings for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.interview_bookings for select to authenticated using (private.customer_can_see_application(application_id));

-- Mail data for one booking (candidate side and team side share it).
create or replace function private.booking_mail_data(b uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'firstName', c.first_name, 'candidate', c.first_name || ' ' || c.last_name, 'jobTitle', v.title,
    'employer', case when v.employer_visible then o.name end, 'tone', o.candidate_tone,
    'startsAt', s.starts_at, 'minutes', s.duration_minutes, 'mode', s.mode, 'location', s.location, 'note', s.note,
    'applicationId', a.id, 'vacancyId', v.id)
  from public.interview_bookings ib
  join public.interview_slots s on s.id = ib.slot_id
  join public.applications a on a.id = ib.application_id
  join public.candidates c on c.id = a.candidate_id
  join public.vacancies v on v.id = a.vacancy_id
  join public.organizations o on o.id = v.organization_id
  where ib.id = b;
$$;
revoke execute on function private.booking_mail_data(uuid) from public, anon, authenticated;

-- Team mail: the vacancy's contacts (or owners and members) plus whoever sent the invitation at recrewted.
create or replace function private.queue_team_booking(b uuid, what text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d jsonb := private.booking_mail_data(b) || jsonb_build_object('event', what);
  vac uuid := (d ->> 'vacancyId')::uuid;
begin
  insert into public.mail_outbox (to_email, template, data)
  select distinct u.email, 'team_booking', d || jsonb_build_object('staff', p.role in ('admin', 'recruiter'))
  from public.profiles p join auth.users u on u.id = p.id
  where u.email is not null and (
    exists (select 1 from public.vacancy_contacts vc where vc.vacancy_id = vac and vc.profile_id = p.id)
    or (not exists (select 1 from public.vacancy_contacts vc where vc.vacancy_id = vac)
        and exists (select 1 from public.customer_members m join public.vacancies v on v.organization_id = m.organization_id
                    where v.id = vac and m.profile_id = p.id and m.member_role in ('owner', 'member')))
    or exists (select 1 from public.mail_outbox mo where mo.template = 'booking_invite' and mo.application_id = (d ->> 'applicationId')::uuid
               and mo.data ->> 'invitedBy' = p.id::text)
  );
end;
$$;
revoke execute on function private.queue_team_booking(uuid, text) from public, anon, authenticated;

-- Book (or rebook) a slot for an application. Called by the server with the candidate's verified link.
create or replace function public.book_slot(app uuid, slot uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a public.applications;
  s public.interview_slots;
  old_b public.interview_bookings;
  new_id uuid;
  c public.candidates;
begin
  select * into a from public.applications where id = app for update;
  if a.id is null or a.status in ('rejected', 'withdrawn', 'hired', 'knockout_failed') then
    raise exception 'not_bookable';
  end if;
  select * into s from public.interview_slots where id = slot for update;
  if s.id is null or s.cancelled_at is not null or s.vacancy_id <> a.vacancy_id or s.starts_at < now() + interval '2 hours' then
    raise exception 'slot_unavailable';
  end if;
  if exists (select 1 from public.interview_bookings where slot_id = slot and cancelled_at is null) then
    raise exception 'slot_taken';
  end if;
  select ib.* into old_b from public.interview_bookings ib where ib.application_id = app and ib.cancelled_at is null;
  if old_b.id is not null then
    if (select starts_at from public.interview_slots where id = old_b.slot_id) < now() + interval '24 hours' then
      raise exception 'too_late';
    end if;
    update public.interview_bookings set cancelled_at = now(), cancelled_by = 'candidate' where id = old_b.id;
  end if;
  insert into public.interview_bookings (slot_id, application_id) values (slot, app) returning id into new_id;

  if a.status <> 'interview' then
    update public.applications set status = 'interview' where id = app;
  end if;
  -- The generic "we will get in touch for a date" mail is outdated now: the date is booked.
  update public.mail_outbox set cancelled_at = now()
  where application_id = app and template = 'status_update' and data ->> 'status' = 'interview' and sent_at is null and cancelled_at is null;

  select * into c from public.candidates where id = a.candidate_id;
  if c.email is not null then
    insert into public.mail_outbox (application_id, candidate_id, to_email, template, data)
    values (app, c.id, c.email, 'interview_booked', private.booking_mail_data(new_id) || jsonb_build_object('rebooked', old_b.id is not null));
  end if;
  perform private.queue_team_booking(new_id, case when old_b.id is null then 'booked' else 'rebooked' end);
  return new_id;
end;
$$;
revoke execute on function public.book_slot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.book_slot(uuid, uuid) to service_role;

-- Cancel the active booking of an application: by the candidate (24 h before at the latest) or by the team.
create or replace function public.cancel_booking(app uuid, by_whom text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  b public.interview_bookings;
  starts timestamptz;
  c public.candidates;
begin
  if by_whom not in ('candidate', 'team') then
    raise exception 'invalid';
  end if;
  select ib.* into b from public.interview_bookings ib where ib.application_id = app and ib.cancelled_at is null for update;
  if b.id is null then
    return false;
  end if;
  select starts_at into starts from public.interview_slots where id = b.slot_id;
  if by_whom = 'candidate' and starts < now() + interval '24 hours' then
    raise exception 'too_late';
  end if;
  update public.interview_bookings set cancelled_at = now(), cancelled_by = by_whom where id = b.id;
  update public.mail_outbox set cancelled_at = now()
  where application_id = app and template = 'interview_reminder' and sent_at is null and cancelled_at is null;
  if by_whom = 'team' then
    select cd.* into c from public.candidates cd join public.applications a on a.candidate_id = cd.id where a.id = app;
    if c.email is not null then
      insert into public.mail_outbox (application_id, candidate_id, to_email, template, data)
      values (app, c.id, c.email, 'interview_cancelled', private.booking_mail_data(b.id));
    end if;
  else
    perform private.queue_team_booking(b.id, 'cancelled');
  end if;
  return true;
end;
$$;
revoke execute on function public.cancel_booking(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid, text) to service_role;

-- A cancelled slot cancels its booking and tells the candidate.
create or replace function private.slot_cancelled() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  app uuid;
begin
  if old.cancelled_at is null and new.cancelled_at is not null then
    select application_id into app from public.interview_bookings where slot_id = new.id and cancelled_at is null;
    if app is not null then
      perform public.cancel_booking(app, 'team');
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function private.slot_cancelled() from public, anon, authenticated;
create trigger slot_cancelled after update of cancelled_at on public.interview_slots
  for each row execute function private.slot_cancelled();

-- Daily: reminder for interviews in the next 12 to 36 hours.
create or replace function public.queue_interview_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  with due as (
    update public.interview_bookings ib set reminder_sent_at = now()
    from public.interview_slots s
    where s.id = ib.slot_id and ib.cancelled_at is null and ib.reminder_sent_at is null
      and s.starts_at between now() + interval '12 hours' and now() + interval '36 hours'
    returning ib.id, ib.application_id
  )
  insert into public.mail_outbox (application_id, candidate_id, to_email, template, data)
  select due.application_id, c.id, c.email, 'interview_reminder', private.booking_mail_data(due.id)
  from due join public.applications a on a.id = due.application_id join public.candidates c on c.id = a.candidate_id
  where c.email is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.queue_interview_reminders() from public, anon, authenticated;
grant execute on function public.queue_interview_reminders() to service_role;

-- ---------------------------------------------------------------
-- 2) WhatsApp
-- ---------------------------------------------------------------
alter table public.candidates
  add column whatsapp_opt_in_at timestamptz,
  add column whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$');

create table public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  mail_id uuid references public.mail_outbox (id) on delete set null,
  to_phone text not null,
  template text not null,
  params jsonb not null default '{}'::jsonb,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  cancelled_at timestamptz,
  wa_message_id text unique,
  delivery text check (delivery in ('sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now()
);
create index whatsapp_outbox_due_idx on public.whatsapp_outbox (send_after) where sent_at is null and cancelled_at is null;
alter table public.whatsapp_outbox enable row level security;
create policy staff_read on public.whatsapp_outbox for select to authenticated using (private.is_staff());

create table public.whatsapp_inbound (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id) on delete cascade,
  from_phone text not null,
  body text,
  wa_message_id text unique,
  received_at timestamptz not null default now()
);
alter table public.whatsapp_inbound enable row level security;
create policy staff_read on public.whatsapp_inbound for select to authenticated using (private.is_staff());

-- Candidate-facing mails that also go out as a WhatsApp template (if the candidate opted in).
-- Cancelling the mail cancels the WhatsApp message, too.
create or replace function private.mirror_to_whatsapp() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.candidates;
begin
  if new.candidate_id is null or new.template not in
     ('status_update', 'assessment_invite', 'booking_invite', 'interview_booked', 'interview_cancelled', 'interview_reminder') then
    return null;
  end if;
  select * into c from public.candidates where id = new.candidate_id;
  if c.whatsapp_opt_in_at is null or c.whatsapp_phone is null then
    return null;
  end if;
  insert into public.whatsapp_outbox (candidate_id, application_id, mail_id, to_phone, template, params, send_after)
  values (c.id, new.application_id, new.id, c.whatsapp_phone, new.template, new.data, new.send_after);
  return null;
end;
$$;
revoke execute on function private.mirror_to_whatsapp() from public, anon, authenticated;
create trigger mirror_to_whatsapp after insert on public.mail_outbox
  for each row execute function private.mirror_to_whatsapp();

create or replace function private.cancel_whatsapp_with_mail() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.cancelled_at is null and new.cancelled_at is not null then
    update public.whatsapp_outbox set cancelled_at = now() where mail_id = new.id and sent_at is null and cancelled_at is null;
  end if;
  return null;
end;
$$;
revoke execute on function private.cancel_whatsapp_with_mail() from public, anon, authenticated;
create trigger cancel_whatsapp_with_mail after update of cancelled_at on public.mail_outbox
  for each row execute function private.cancel_whatsapp_with_mail();

create or replace function public.claim_due_whatsapp(max_count int default 50) returns setof public.whatsapp_outbox
language sql security definer set search_path = public as $$
  update public.whatsapp_outbox w set attempts = w.attempts + 1
  where w.id in (
    select x.id from public.whatsapp_outbox x
    join public.candidates c on c.id = x.candidate_id
    where x.sent_at is null and x.cancelled_at is null and x.send_after <= now() and x.attempts < 5
      and c.whatsapp_opt_in_at is not null
    order by x.send_after
    limit max_count
    for update of x skip locked
  )
  returning w.*;
$$;
revoke execute on function public.claim_due_whatsapp(int) from public, anon, authenticated;
grant execute on function public.claim_due_whatsapp(int) to service_role;

-- ---------------------------------------------------------------
-- Data subject export: add interviews and WhatsApp
-- ---------------------------------------------------------------
alter function public.candidate_export(uuid) rename to candidate_export_base;
alter function public.candidate_export_base(uuid) set schema private;
revoke execute on function private.candidate_export_base(uuid) from public, anon, authenticated;

create or replace function public.candidate_export(cand uuid) returns jsonb
language sql security definer set search_path = public as $$
  select private.candidate_export_base(cand) || jsonb_build_object(
    'interviews', coalesce((
      select jsonb_agg(jsonb_build_object('job', v.title, 'starts_at', s.starts_at, 'mode', s.mode, 'booked_at', ib.booked_at, 'cancelled_at', ib.cancelled_at) order by s.starts_at)
      from public.interview_bookings ib join public.interview_slots s on s.id = ib.slot_id
      join public.applications a on a.id = ib.application_id join public.vacancies v on v.id = a.vacancy_id
      where a.candidate_id = cand), '[]'::jsonb),
    'whatsapp_messages', coalesce((
      select jsonb_agg(jsonb_build_object('template', w.template, 'sent_at', w.sent_at, 'delivery', w.delivery) order by w.created_at)
      from public.whatsapp_outbox w where w.candidate_id = cand), '[]'::jsonb),
    'whatsapp_replies', coalesce((
      select jsonb_agg(jsonb_build_object('text', i.body, 'received_at', i.received_at) order by i.received_at)
      from public.whatsapp_inbound i where i.candidate_id = cand), '[]'::jsonb)
  );
$$;
revoke execute on function public.candidate_export(uuid) from public, anon, authenticated;
grant execute on function public.candidate_export(uuid) to service_role;
