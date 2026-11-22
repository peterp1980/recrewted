-- Job import (on behalf of our customers) and external partner jobs.
-- 1) Customers' own jobs are fetched from their applicant tracking system or career page and become
--    draft vacancies; a recruiter checks and releases them. Nothing goes live automatically.
-- 2) Partner jobs (Adzuna, Jooble) are shown on the job board as clearly marked external listings;
--    they are fetched at request time and never stored here.

create table public.feature_switches (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.feature_switches enable row level security;
create policy staff_read on public.feature_switches for select to authenticated using (private.is_staff());
create policy admin_update on public.feature_switches for update to authenticated using (private.is_admin()) with check (private.is_admin());
insert into public.feature_switches (key, enabled) values ('import_customer_jobs', true), ('external_jobs', false);

create table public.job_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('personio', 'greenhouse', 'lever', 'smartrecruiters', 'recruitee', 'workable', 'jsonld')),
  -- Company handle at the provider (e.g. "hafermann") or, for jsonld, the https URL of the career page.
  source text not null check (char_length(source) between 2 and 300),
  enabled boolean not null default true,
  last_run_at timestamptz,
  last_result jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (organization_id, provider, source)
);
alter table public.job_imports enable row level security;
create policy staff_read on public.job_imports for select to authenticated using (private.is_staff());
create policy admin_write on public.job_imports for all to authenticated using (private.is_admin()) with check (private.is_admin());

create table public.imported_jobs (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.job_imports (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 200),
  vacancy_id uuid references public.vacancies (id) on delete set null,
  title text not null,
  url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when the job is no longer listed at the source (closed or filled there).
  gone_at timestamptz,
  unique (import_id, external_id)
);
alter table public.imported_jobs enable row level security;
create policy staff_read on public.imported_jobs for select to authenticated using (private.is_staff());
