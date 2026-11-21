-- Status mails to candidates: nobody waits without an answer.
-- Queued by trigger, so every path (recruiter, customer feedback, pipeline) is covered.
-- Sent after 10 minutes; a quick correction of the status cancels the pending mail.

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update'));

create or replace function private.queue_status_mail() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.candidates;
  v record;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  -- A pending status mail for an older status is outdated now.
  update public.mail_outbox set cancelled_at = now()
  where application_id = new.id and template = 'status_update' and sent_at is null and cancelled_at is null;

  if new.status not in ('shortlisted', 'interview', 'hired', 'rejected') then
    return null;
  end if;
  -- A personal rejection by the recruiter replaces the automatic one.
  if new.status = 'rejected' and exists (
    select 1 from public.mail_outbox where application_id = new.id and template = 'rejection' and cancelled_at is null
  ) then
    return null;
  end if;

  select * into c from public.candidates where id = new.candidate_id;
  if c.email is null then
    return null;
  end if;
  select va.title, va.employer_visible, o.name, o.candidate_tone into v
  from public.vacancies va join public.organizations o on o.id = va.organization_id where va.id = new.vacancy_id;

  insert into public.mail_outbox (application_id, candidate_id, to_email, template, data, send_after)
  values (new.id, c.id, c.email, 'status_update',
          jsonb_build_object('status', new.status, 'firstName', c.first_name, 'jobTitle', v.title,
                             'employer', case when v.employer_visible then v.name end, 'tone', v.candidate_tone),
          now() + interval '10 minutes');
  return null;
end;
$$;
revoke execute on function private.queue_status_mail() from public, anon, authenticated;
create trigger queue_status_mail after update of status on public.applications
  for each row execute function private.queue_status_mail();

-- Daily: applications still in review after 7 days get one "we are still on it" mail.
create or replace function public.queue_pending_reminders(days int default 7) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into public.mail_outbox (application_id, candidate_id, to_email, template, data)
  select a.id, c.id, c.email, 'status_update',
         jsonb_build_object('status', 'pending', 'firstName', c.first_name, 'jobTitle', va.title,
                            'employer', case when va.employer_visible then o.name end, 'tone', o.candidate_tone)
  from public.applications a
  join public.candidates c on c.id = a.candidate_id
  join public.vacancies va on va.id = a.vacancy_id
  join public.organizations o on o.id = va.organization_id
  where a.status in ('new', 'screening', 'qualified')
    and a.submitted_at < now() - make_interval(days => days)
    and c.email is not null
    and not exists (select 1 from public.mail_outbox m where m.application_id = a.id and m.template = 'status_update');
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.queue_pending_reminders(int) from public, anon, authenticated;
grant execute on function public.queue_pending_reminders(int) to service_role;
