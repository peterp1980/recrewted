-- 1) Recommended questions: asked in the application, not mandatory, never exclude anyone.
--    The answer suggests a rating for a linked scorecard criterion; a person decides.
alter table public.screening_questions
  add column required boolean not null default true,
  add column criterion_id uuid references public.scorecard_criteria (id) on delete set null,
  -- { "yes": 5, "no": 1 } or { "<option>": 1..5 }
  add column rating_map jsonb check (rating_map is null or jsonb_typeof(rating_map) = 'object');

-- 2) Candidate profile (opt-in at the application) and job alerts.
--    "More jobs" stays the existing talent pool consent (talent_pool_consent_at).
alter table public.candidates
  add column profile_opt_in_at timestamptz,
  -- { "categories": [...], "types": [...], "postalCode": "80339", "radiusKm": 30 }
  add column alert_prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(alert_prefs) = 'object'),
  add column last_alert_at timestamptz;

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert'));

-- 3) Retention: candidates kept only for the talent pool are deleted after pool_months
--    (counted from their consent), not kept forever.
create or replace function public.run_retention(
  application_months int default 6,
  click_id_days int default 90,
  event_months int default 26,
  mail_days int default 90,
  pool_months int default 24
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  cvs text[];
  uploads text[];
  n_apps int;
  n_cands int;
  n_clicks int;
  n_events int;
  n_mails int;
begin
  select coalesce(array_agg(cv_storage_path) filter (where cv_storage_path is not null), '{}') into cvs
  from public.applications
  where closed_at is not null and closed_at < now() - make_interval(months => application_months);

  select coalesce(array_agg(ans.file_path) filter (where ans.file_path is not null), '{}') into uploads
  from public.assessment_answers ans
  join public.assessment_attempts att on att.id = ans.attempt_id
  join public.applications a on a.id = att.application_id
  where a.closed_at is not null and a.closed_at < now() - make_interval(months => application_months);

  delete from public.applications
  where closed_at is not null and closed_at < now() - make_interval(months => application_months);
  get diagnostics n_apps = row_count;

  delete from public.candidates c
  where not exists (select 1 from public.applications a where a.candidate_id = c.id)
    and (c.talent_pool_consent_at is null or c.talent_pool_consent_at < now() - make_interval(months => pool_months));
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
  values ('retention', 'applications', jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails, 'assessment_files', coalesce(array_length(uploads, 1), 0)));

  return jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails,
                            'cv_paths', to_jsonb(cvs), 'assessment_paths', to_jsonb(uploads));
end;
$$;
drop function if exists public.run_retention(int, int, int, int);
revoke execute on function public.run_retention(int, int, int, int, int) from public, anon, authenticated;
grant execute on function public.run_retention(int, int, int, int, int) to service_role;
