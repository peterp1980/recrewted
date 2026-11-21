-- Weekly report for customers (Mondays): numbers per vacancy, link to the portal and the PDF.
alter table public.organizations add column weekly_report boolean not null default true;

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report'));
