-- Assessments: tests per vacancy, either right after applying ('apply') or sent later by a recruiter ('invite').
-- Closed questions are scored automatically, open answers, cases and uploads by a person (no AI score).
-- Candidates reach their attempt only through a random link; the server looks it up by a hash of the token.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 150),
  intro text not null default '' check (char_length(intro) <= 3000),
  stage text not null default 'invite' check (stage in ('apply', 'invite')),
  time_limit_minutes int check (time_limit_minutes between 1 and 600),
  -- Only one active test per stage and vacancy, so the apply flow knows which one to start.
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index assessments_one_active_per_stage on public.assessments (vacancy_id, stage) where active;

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('yes_no', 'single', 'multi', 'text', 'case', 'upload')),
  prompt text not null check (char_length(prompt) between 3 and 2000),
  case_text text not null default '' check (char_length(case_text) <= 10000),
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  -- yes_no: "yes"/"no"; single: "option"; multi: ["option", …]. Null for open questions.
  correct jsonb,
  points numeric(5, 1) not null default 1 check (points > 0 and points <= 100),
  unique (assessment_id, position)
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'sent' check (status in ('sent', 'started', 'submitted')),
  sent_at timestamptz not null default now(),
  started_at timestamptz,
  deadline_at timestamptz,
  submitted_at timestamptz,
  late boolean not null default false,
  auto_points numeric(7, 1),
  manual_points numeric(7, 1),
  max_points numeric(7, 1),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  unique (assessment_id, application_id)
);
create index assessment_attempts_application_idx on public.assessment_attempts (application_id);

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  answer jsonb,
  file_path text,
  file_name text check (char_length(file_name) <= 200),
  auto_points numeric(5, 1),
  manual_points numeric(5, 1) check (manual_points >= 0),
  reviewer_note text check (char_length(reviewer_note) <= 1000),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- What happened in the browser while the test ran: only type and time, never content.
create table public.assessment_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  type text not null check (type in ('left_window', 'returned', 'tab_hidden', 'tab_visible', 'paste', 'copy', 'cut', 'context_menu', 'fullscreen_exit')),
  question_id uuid,
  occurred_at timestamptz not null default now()
);
create index assessment_events_attempt_idx on public.assessment_events (attempt_id, occurred_at);

do $$
declare t text;
begin
  foreach t in array array['assessments', 'assessment_questions', 'assessment_attempts', 'assessment_answers', 'assessment_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (private.is_staff()) with check (private.is_staff())', t);
  end loop;
end $$;

-- Customers see the result of shortlisted candidates of their own vacancies (like the scorecard), nothing else.
create policy member_read on public.assessment_attempts for select to authenticated
  using (exists (
    select 1 from public.applications a join public.vacancies v on v.id = a.vacancy_id
    where a.id = application_id and a.shortlisted_at is not null and private.is_org_member(v.organization_id)
  ));
create policy member_read on public.assessments for select to authenticated
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and private.is_org_member(v.organization_id)));

-- Changes to answers and points are applicant data: log them like ratings (0003).
create trigger audit_change after insert or update or delete on public.assessment_attempts
  for each row execute function private.audit_row_change();
create trigger audit_change after insert or update or delete on public.assessment_answers
  for each row execute function private.audit_row_change();

-- Private bucket for uploaded work (presentations, documents). Never public.
insert into storage.buckets (id, name, public, file_size_limit)
values ('assessment-uploads', 'assessment-uploads', false, 20971520)
on conflict (id) do nothing;
update storage.buckets set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg'
] where id = 'assessment-uploads';

-- Invitation mail.
alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request', 'assessment_invite'));

-- Retention (0009) now also returns uploaded assessment files of deleted applications.
create or replace function public.run_retention(
  application_months int default 6,
  click_id_days int default 90,
  event_months int default 26,
  mail_days int default 90
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
  values ('retention', 'applications', jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails, 'assessment_files', coalesce(array_length(uploads, 1), 0)));

  return jsonb_build_object('applications', n_apps, 'candidates', n_cands, 'click_ids', n_clicks, 'events', n_events, 'mails', n_mails,
                            'cv_paths', to_jsonb(cvs), 'assessment_paths', to_jsonb(uploads));
end;
$$;
revoke execute on function public.run_retention(int, int, int, int) from public, anon, authenticated;
grant execute on function public.run_retention(int, int, int, int) to service_role;

-- Data subject request (0009): the export now includes tests, answers and the browser log.
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
        'cv_uploaded', a.cv_storage_path is not null,
        'assessments', (select jsonb_agg(jsonb_build_object(
            'test', s.title, 'sent_at', t.sent_at, 'started_at', t.started_at, 'submitted_at', t.submitted_at,
            'points', coalesce(t.auto_points, 0) + coalesce(t.manual_points, 0), 'max_points', t.max_points,
            'answers', (select jsonb_agg(jsonb_build_object('task', q.prompt, 'answer', ans.answer, 'file', ans.file_name,
                          'points', coalesce(ans.auto_points, ans.manual_points), 'note', ans.reviewer_note) order by q.position)
                        from public.assessment_answers ans join public.assessment_questions q on q.id = ans.question_id where ans.attempt_id = t.id),
            'browser_log', (select jsonb_agg(jsonb_build_object('type', e.type, 'at', e.occurred_at) order by e.occurred_at)
                        from public.assessment_events e where e.attempt_id = t.id)))
          from public.assessment_attempts t join public.assessments s on s.id = t.assessment_id where t.application_id = a.id)
      ))
      from public.applications a join public.vacancies v on v.id = a.vacancy_id where a.candidate_id = cand
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.candidate_export(uuid) from public, anon, authenticated;
grant execute on function public.candidate_export(uuid) to service_role;
