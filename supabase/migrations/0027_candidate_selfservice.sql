-- Candidate self-service in the applicant profile:
-- 1) withdraw an application at any time;
-- 2) ask for short feedback after a rejection (answered by a recruiter, job-related only).

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report', 'pool_invite',
                      'team_mention', 'team_shortlist', 'vacancy_request',
                      'booking_invite', 'interview_booked', 'interview_cancelled', 'interview_reminder', 'team_booking',
                      'feedback_reminder', 'candidate_survey', 'team_withdrawn', 'feedback_answer'));

-- Withdraw: called by the server after the profile link was verified.
create or replace function public.withdraw_application(app uuid, cand uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  a public.applications;
  v record;
begin
  select * into a from public.applications where id = app and candidate_id = cand for update;
  if a.id is null or a.status in ('hired', 'rejected', 'withdrawn', 'knockout_failed') then
    return false;
  end if;
  update public.applications set status = 'withdrawn', closed_at = coalesce(closed_at, now()) where id = app;
  -- Nothing more goes out for this application, and a booked interview is freed.
  update public.mail_outbox set cancelled_at = now() where application_id = app and sent_at is null and cancelled_at is null;
  update public.interview_bookings set cancelled_at = now(), cancelled_by = 'candidate' where application_id = app and cancelled_at is null;

  -- The customer only hears about it if the candidate was already on their shortlist.
  if a.shortlisted_at is not null then
    select va.id, va.title, va.organization_id into v from public.vacancies va where va.id = a.vacancy_id;
    insert into public.mail_outbox (to_email, template, data)
    select distinct u.email, 'team_withdrawn',
           jsonb_build_object('jobTitle', v.title, 'vacancyId', v.id, 'applicationId', app, 'staff', p.role in ('admin', 'recruiter'))
    from public.profiles p join auth.users u on u.id = p.id
    where u.email is not null and (
      exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id and c.profile_id = p.id)
      or (not exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id)
          and exists (select 1 from public.customer_members m where m.organization_id = v.organization_id and m.profile_id = p.id and m.member_role in ('owner', 'member')))
    );
  end if;
  insert into public.audit_log (action, table_name, record_id, details) values ('withdraw', 'applications', app, jsonb_build_object('by', 'data_subject'));
  return true;
end;
$$;
revoke execute on function public.withdraw_application(uuid, uuid) from public, anon, authenticated;
grant execute on function public.withdraw_application(uuid, uuid) to service_role;

-- Feedback on request after a rejection. One request per application; answered by a person.
create table public.feedback_requests (
  application_id uuid primary key references public.applications (id) on delete cascade,
  requested_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by uuid references public.profiles (id),
  answer text check (answer is null or char_length(answer) between 20 and 3000)
);
alter table public.feedback_requests enable row level security;
create policy staff_all on public.feedback_requests for all to authenticated using (private.is_staff()) with check (private.is_staff());
