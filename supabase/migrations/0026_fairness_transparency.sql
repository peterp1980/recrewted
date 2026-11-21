-- 1) Blind review: customers see shortlisted candidates without identity until they want to meet them.
-- 2) Pay transparency: salary information for candidates, included in interview invitations.
-- 3) Feedback reminders to customers (nobody waits without an answer).
-- 4) Candidate experience survey: voluntary, one question, aggregated for customers.

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report', 'pool_invite',
                      'team_mention', 'team_shortlist', 'vacancy_request',
                      'booking_invite', 'interview_booked', 'interview_cancelled', 'interview_reminder', 'team_booking',
                      'feedback_reminder', 'candidate_survey'));

-- ---------------------------------------------------------------
-- 1) Blind review
-- ---------------------------------------------------------------
alter table public.organizations add column blind_review boolean not null default false;

-- Identity (name, contact, CV) is visible to staff, and to the customer once they want to meet the candidate.
create or replace function private.customer_can_see_identity(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_staff() or exists (
    select 1 from public.applications ap
    join public.vacancies v on v.id = ap.vacancy_id
    join public.organizations o on o.id = v.organization_id
    where ap.id = a and private.customer_can_see_application(ap.id)
      and (not o.blind_review or ap.status in ('interview', 'hired'))
  )
$$;
revoke execute on function private.customer_can_see_identity(uuid) from public, anon;
grant execute on function private.customer_can_see_identity(uuid) to authenticated;

drop policy candidates_member_read on public.candidates;
create policy candidates_member_read on public.candidates for select to authenticated
  using (exists (
    select 1 from public.applications ap
    where ap.candidate_id = candidates.id and private.customer_can_see_identity(ap.id)
  ));

-- Mentions in comments must not leak the name of an anonymous candidate either.
create or replace function private.comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  info record;
begin
  select v.id as vacancy_id, v.title, c.first_name, c.last_name, o.blind_review, a.status into info
  from public.applications a join public.vacancies v on v.id = a.vacancy_id join public.candidates c on c.id = a.candidate_id
  join public.organizations o on o.id = v.organization_id
  where a.id = new.application_id;

  insert into public.mail_outbox (to_email, template, data)
  select u.email, 'team_mention',
         jsonb_build_object('firstName', coalesce(split_part(p.full_name, ' ', 1), ''), 'author', new.author_name,
                            'candidate', case when info.blind_review and info.status not in ('interview', 'hired') and p.role not in ('admin', 'recruiter')
                                              then 'anonym' else info.first_name || ' ' || left(info.last_name, 1) || '.' end,
                            'jobTitle', info.title, 'excerpt', left(new.body, 300), 'applicationId', new.application_id,
                            'staff', p.role in ('admin', 'recruiter'), 'question', new.kind = 'question')
  from public.profiles p join auth.users u on u.id = p.id
  where u.email is not null
    and (p.id = any (new.mentions)
         or (new.kind = 'question' and cardinality(new.mentions) = 0 and p.role in ('admin', 'recruiter')))
    and p.id is distinct from new.author_id;
  return null;
end;
$$;

-- ---------------------------------------------------------------
-- 2) Pay transparency
-- ---------------------------------------------------------------
-- Free text for candidates when no range is published, e.g. "45.000–52.000 € brutto im Jahr, je nach Erfahrung".
alter table public.vacancies add column salary_note text check (salary_note is null or char_length(salary_note) between 3 and 300);

create or replace function private.booking_mail_data(b uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'firstName', c.first_name, 'candidate', c.first_name || ' ' || c.last_name, 'jobTitle', v.title,
    'employer', case when v.employer_visible then o.name end, 'tone', o.candidate_tone,
    'startsAt', s.starts_at, 'minutes', s.duration_minutes, 'mode', s.mode, 'location', s.location, 'note', s.note,
    'applicationId', a.id, 'vacancyId', v.id,
    'salaryMin', v.salary_min, 'salaryMax', v.salary_max, 'salaryPeriod', v.salary_period, 'salaryNote', v.salary_note)
  from public.interview_bookings ib
  join public.interview_slots s on s.id = ib.slot_id
  join public.applications a on a.id = ib.application_id
  join public.candidates c on c.id = a.candidate_id
  join public.vacancies v on v.id = a.vacancy_id
  join public.organizations o on o.id = v.organization_id
  where ib.id = b;
$$;

-- ---------------------------------------------------------------
-- 3) Feedback reminders
-- ---------------------------------------------------------------
-- Daily on working days: shortlisted candidates without customer feedback for 3+ days. One mail per person and vacancy,
-- at most every 3 days.
create or replace function public.queue_feedback_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if extract(isodow from now() at time zone 'Europe/Berlin') > 5 then
    return 0;
  end if;
  with waiting as (
    select a.vacancy_id, count(*) as open_count
    from public.applications a
    where a.status = 'shortlisted' and a.shortlisted_at < now() - interval '3 days'
      and not exists (select 1 from public.customer_feedback f where f.application_id = a.id)
    group by a.vacancy_id
  )
  insert into public.mail_outbox (to_email, template, data)
  select distinct on (u.email, v.id) u.email, 'feedback_reminder',
         jsonb_build_object('firstName', coalesce(split_part(p.full_name, ' ', 1), ''), 'jobTitle', v.title, 'vacancyId', v.id, 'open', w.open_count)
  from waiting w
  join public.vacancies v on v.id = w.vacancy_id
  join public.customer_members m on m.organization_id = v.organization_id
  join public.profiles p on p.id = m.profile_id
  join auth.users u on u.id = m.profile_id
  where u.email is not null
    and (exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id and c.profile_id = m.profile_id)
         or (not exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id) and m.member_role in ('owner', 'member')))
    and not exists (
      select 1 from public.mail_outbox o
      where o.template = 'feedback_reminder' and o.to_email = u.email and o.data ->> 'vacancyId' = v.id::text
        and o.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.queue_feedback_reminders() from public, anon, authenticated;
grant execute on function public.queue_feedback_reminders() to service_role;

-- ---------------------------------------------------------------
-- 4) Candidate experience survey
-- ---------------------------------------------------------------
create table public.candidate_surveys (
  application_id uuid primary key references public.applications (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  outcome text not null check (outcome in ('hired', 'rejected')),
  sent_at timestamptz not null default now(),
  answered_at timestamptz,
  score int check (score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000)
);
alter table public.candidate_surveys enable row level security;
create policy staff_read on public.candidate_surveys for select to authenticated using (private.is_staff());

-- After the final decision (not after automatic knockouts): one invitation, two days later, only with an e-mail address.
create or replace function private.queue_candidate_survey() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.candidates;
  v record;
begin
  if new.status is not distinct from old.status or new.status not in ('hired', 'rejected')
     or exists (select 1 from public.candidate_surveys where application_id = new.id) then
    return null;
  end if;
  select * into c from public.candidates where id = new.candidate_id;
  if c.email is null then
    return null;
  end if;
  select va.title, va.organization_id, o.candidate_tone into v from public.vacancies va join public.organizations o on o.id = va.organization_id where va.id = new.vacancy_id;
  insert into public.candidate_surveys (application_id, organization_id, outcome) values (new.id, v.organization_id, new.status::text);
  insert into public.mail_outbox (application_id, candidate_id, to_email, template, data, send_after)
  values (new.id, c.id, c.email, 'candidate_survey',
          jsonb_build_object('firstName', c.first_name, 'jobTitle', v.title, 'applicationId', new.id, 'tone', v.candidate_tone),
          now() + interval '2 days');
  return null;
end;
$$;
revoke execute on function private.queue_candidate_survey() from public, anon, authenticated;
create trigger queue_candidate_survey after update of status on public.applications
  for each row execute function private.queue_candidate_survey();

-- Customers see the average only from 5 answers on, so no single candidate can be recognized.
create or replace function public.candidate_experience(org uuid)
returns table (answers bigint, avg_score numeric, hired_avg numeric, rejected_avg numeric)
language sql stable security definer set search_path = public as $$
  select count(score), round(avg(score), 1),
         round(avg(score) filter (where outcome = 'hired'), 1), round(avg(score) filter (where outcome = 'rejected'), 1)
  from public.candidate_surveys
  where organization_id = org and score is not null and (private.is_staff() or private.is_org_member(org))
  having count(score) >= 5 or private.is_staff();
$$;
revoke execute on function public.candidate_experience(uuid) from public, anon;
grant execute on function public.candidate_experience(uuid) to authenticated;
