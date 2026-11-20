-- recrewted – Startschema MVP
-- Supabase (Postgres 15+), Region Frankfurt.
-- Grundsatz: RLS auf jeder Tabelle. Kandidaten haben im MVP keinen Login;
-- ihre Daten schreibt der Server mit dem Service-Role-Key (umgeht RLS).

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
create type public.user_role as enum ('admin', 'recruiter', 'customer');
create type public.vacancy_status as enum ('draft', 'contract_pending', 'active', 'paused', 'filled', 'closed');
create type public.application_status as enum (
  'new', 'knockout_failed', 'screening', 'qualified', 'rejected',
  'shortlisted', 'interview', 'hired', 'withdrawn'
);
create type public.account_owner as enum ('recrewted', 'customer');
create type public.entry_point as enum ('jobboard', 'career_page', 'widget', 'portal_feed');
create type public.pricing_model as enum (
  'fixed_starter', 'fixed_pro', 'fixed_enterprise',
  'service_fee_media_passthrough', 'service_fee_customer_media',
  'success_fee', 'hybrid', 'subscription',
  'self_service_platform', 'self_service_per_candidate', 'license'
);
create type public.contract_status as enum ('draft', 'sent', 'viewed', 'completed', 'declined', 'expired');
create type public.ad_status as enum ('draft', 'approved', 'published', 'archived');
create type public.campaign_status as enum ('draft', 'running', 'paused', 'ended');
create type public.feedback_verdict as enum ('fit', 'no_fit', 'interview', 'hired', 'rejected');

-- ---------------------------------------------------------------
-- Nutzer und Kunden
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  pipedrive_org_id bigint,
  created_at timestamptz not null default now()
);

create table public.customer_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (organization_id, profile_id)
);

-- ---------------------------------------------------------------
-- Vakanzen und alles, was daran hängt
-- ---------------------------------------------------------------
create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  location text,
  remote boolean not null default false,
  employment_type text,
  salary_min numeric(10, 2),
  salary_max numeric(10, 2),
  salary_period text not null default 'year' check (salary_period in ('hour', 'month', 'year')),
  status public.vacancy_status not null default 'draft',
  pricing_model public.pricing_model,
  pipedrive_deal_id bigint,
  published_at timestamptz,
  filled_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_required_when_active
    check (status in ('draft', 'contract_pending') or (salary_min is not null and salary_max is not null)),
  constraint salary_range_valid check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create table public.vacancy_briefings (
  vacancy_id uuid primary key references public.vacancies (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  submitted_by uuid references public.profiles (id),
  submitted_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vacancy_id uuid references public.vacancies (id) on delete set null,
  kind text not null check (kind in ('offer', 'terms', 'dpa', 'order_confirmation')),
  pandadoc_document_id text unique,
  template_version text not null,
  status public.contract_status not null default 'draft',
  signed_at timestamptz,
  storage_path text,
  created_at timestamptz not null default now()
);

create table public.screening_questions (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  position int not null,
  question text not null,
  kind text not null check (kind in ('yes_no', 'choice', 'number')),
  options jsonb,
  knockout_rule jsonb,
  unique (vacancy_id, position)
);

create table public.scorecard_criteria (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  position int not null,
  name text not null,
  description text,
  weight numeric(4, 2) not null default 1 check (weight > 0),
  unique (vacancy_id, position)
);

create table public.job_ads (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  channel text not null,
  template_key text,
  version int not null default 1,
  title text not null,
  body text not null,
  status public.ad_status not null default 'draft',
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (vacancy_id, channel, version)
);

-- ---------------------------------------------------------------
-- Werbekonten, Kampagnen, Kosten
-- ---------------------------------------------------------------
create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('meta', 'google', 'tiktok', 'linkedin', 'indeed', 'stepstone', 'ba', 'other')),
  owner public.account_owner not null,
  organization_id uuid references public.organizations (id) on delete cascade,
  external_account_id text not null,
  display_name text,
  created_at timestamptz not null default now(),
  constraint customer_account_needs_org check (owner = 'recrewted' or organization_id is not null),
  unique (platform, external_account_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id),
  channel text not null,
  budget_eur numeric(10, 2),
  starts_on date,
  ends_on date,
  target_qualified int,
  status public.campaign_status not null default 'draft',
  utm_campaign text,
  external_campaign_id text,
  created_at timestamptz not null default now()
);

create table public.ad_costs (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  day date not null,
  cost_eur numeric(10, 2) not null default 0,
  impressions int,
  clicks int,
  primary key (campaign_id, day)
);

-- ---------------------------------------------------------------
-- Kandidaten und Bewerbungen
-- ---------------------------------------------------------------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  talent_pool_consent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_required check (email is not null or phone is not null)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  status public.application_status not null default 'new',
  cv_storage_path text,
  score numeric(5, 2),
  submitted_at timestamptz not null default now(),
  shortlisted_at timestamptz,
  hired_at timestamptz,
  closed_at timestamptz,
  duplicate_of uuid references public.applications (id),
  unique (vacancy_id, candidate_id)
);

create table public.screening_answers (
  application_id uuid not null references public.applications (id) on delete cascade,
  question_id uuid not null references public.screening_questions (id) on delete cascade,
  answer jsonb not null,
  primary key (application_id, question_id)
);

create table public.scorecard_ratings (
  application_id uuid not null references public.applications (id) on delete cascade,
  criterion_id uuid not null references public.scorecard_criteria (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  reason text,
  ai_suggested boolean not null default false,
  rated_by uuid references public.profiles (id),
  rated_at timestamptz not null default now(),
  primary key (application_id, criterion_id)
);

create table public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  verdict public.feedback_verdict not null,
  reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.application_attribution (
  application_id uuid primary key references public.applications (id) on delete cascade,
  entry_point public.entry_point not null,
  channel text,
  campaign_id uuid references public.campaigns (id),
  ad_account_owner public.account_owner,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  click_id_type text check (click_id_type in ('gclid', 'wbraid', 'gbraid', 'fbclid', 'ttclid', 'li_fat_id')),
  click_id text,
  click_id_expires_at timestamptz
);

-- ---------------------------------------------------------------
-- Tracking, Einwilligung, KI, Protokoll
-- ---------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  name text not null,
  occurred_at timestamptz not null default now(),
  organization_id uuid references public.organizations (id) on delete set null,
  vacancy_id uuid references public.vacancies (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  ad_account_owner public.account_owner,
  channel text,
  entry_point public.entry_point,
  event_id text unique,
  props jsonb not null default '{}'::jsonb
);
create index events_vacancy_name_idx on public.events (vacancy_id, name, occurred_at);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('visitor', 'candidate')),
  subject_ref text not null,
  statistics boolean not null default false,
  marketing boolean not null default false,
  banner_version text not null,
  decided_at timestamptz not null default now()
);

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  vacancy_id uuid references public.vacancies (id) on delete cascade,
  kind text not null check (kind in ('scorecard_rating', 'job_ad_text', 'screening_suggestion')),
  model text not null,
  input_ref jsonb not null,
  output jsonb not null,
  accepted boolean,
  decided_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Hilfsfunktionen für RLS
-- ---------------------------------------------------------------
create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'recruiter'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.customer_members
    where organization_id = org and profile_id = auth.uid()
  )
$$;

create or replace function public.can_see_vacancy(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.vacancies x
    where x.id = v and public.is_org_member(x.organization_id)
  )
$$;

-- Customers see an application once it has been shortlisted, and keep seeing it
-- afterwards (e.g. after they reject it), so their own feedback stays visible.
create or replace function public.customer_can_see_application(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications ap
    join public.vacancies v on v.id = ap.vacancy_id
    where ap.id = a
      and ap.shortlisted_at is not null
      and public.is_org_member(v.organization_id)
  )
$$;

-- RLS helpers are for signed-in users only, not callable by anon via the API.
revoke execute on function
  public.app_role(), public.is_staff(), public.is_admin(),
  public.is_org_member(uuid), public.can_see_vacancy(uuid), public.customer_can_see_application(uuid)
  from public, anon;
grant execute on function
  public.app_role(), public.is_staff(), public.is_admin(),
  public.is_org_member(uuid), public.can_see_vacancy(uuid), public.customer_can_see_application(uuid)
  to authenticated, service_role;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vacancies_touch before update on public.vacancies
  for each row execute function public.touch_updated_at();

-- Keep milestone timestamps in sync with the status, whoever changes it.
create or replace function public.applications_status_timestamps() returns trigger
language plpgsql as $$
begin
  if new.status in ('shortlisted', 'interview', 'hired') and new.shortlisted_at is null then
    new.shortlisted_at = now();
  end if;
  if new.status = 'hired' and new.hired_at is null then
    new.hired_at = now();
  end if;
  return new;
end;
$$;

create trigger applications_status_timestamps before insert or update of status on public.applications
  for each row execute function public.applications_status_timestamps();

-- Every new auth user gets a profile with the least-privileged role.
-- Staff roles are granted by an admin. Public sign-up must be disabled in
-- Supabase Auth (invite only), see README.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'customer', new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.customer_members enable row level security;
alter table public.vacancies enable row level security;
alter table public.vacancy_briefings enable row level security;
alter table public.contracts enable row level security;
alter table public.screening_questions enable row level security;
alter table public.scorecard_criteria enable row level security;
alter table public.job_ads enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_costs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.screening_answers enable row level security;
alter table public.scorecard_ratings enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.application_attribution enable row level security;
alter table public.events enable row level security;
alter table public.consents enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.audit_log enable row level security;

-- Staff: admin and recruiter read everything (except the audit log).
-- Recruiters create and edit recruiting data; deletes are admin-only.
-- Customers and their users (organizations, customer_members) are managed by admins only.
do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'customer_members', 'vacancies', 'vacancy_briefings', 'contracts',
    'screening_questions', 'scorecard_criteria', 'job_ads', 'ad_accounts', 'campaigns',
    'ad_costs', 'candidates', 'applications', 'screening_answers', 'scorecard_ratings',
    'customer_feedback', 'application_attribution', 'events', 'consents', 'ai_recommendations'
  ] loop
    execute format(
      'create policy staff_read on public.%I for select to authenticated using (public.is_staff())', t);
    execute format(
      'create policy admin_delete on public.%I for delete to authenticated using (public.is_admin())', t);
    if t in ('organizations', 'customer_members') then
      execute format(
        'create policy admin_insert on public.%I for insert to authenticated with check (public.is_admin())', t);
      execute format(
        'create policy admin_update on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    else
      execute format(
        'create policy staff_insert on public.%I for insert to authenticated with check (public.is_staff())', t);
      execute format(
        'create policy staff_update on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    end if;
  end loop;
end $$;

-- Profile
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Protokoll: nur Admins lesen; geschrieben wird serverseitig.
create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());

-- Kunden: eigene Organisation
create policy org_member_read on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy members_self_read on public.customer_members for select to authenticated
  using (profile_id = auth.uid());

create policy vacancies_member_read on public.vacancies for select to authenticated
  using (public.is_org_member(organization_id));
create policy vacancies_member_create on public.vacancies for insert to authenticated
  with check (public.is_org_member(organization_id) and status = 'draft');

create policy briefings_member_read on public.vacancy_briefings for select to authenticated
  using (public.can_see_vacancy(vacancy_id));
-- Customers may write the briefing only until the contract is signed;
-- afterwards changes go through the recruiter (staff policies above).
create policy briefings_member_write on public.vacancy_briefings for insert to authenticated
  with check (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and public.is_org_member(v.organization_id)
      and v.status in ('draft', 'contract_pending')
  ));
create policy briefings_member_update on public.vacancy_briefings for update to authenticated
  using (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and public.is_org_member(v.organization_id)
      and v.status in ('draft', 'contract_pending')
  ))
  with check (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and public.is_org_member(v.organization_id)
      and v.status in ('draft', 'contract_pending')
  ));

create policy contracts_member_read on public.contracts for select to authenticated
  using (public.is_org_member(organization_id));

create policy questions_member_read on public.screening_questions for select to authenticated
  using (public.can_see_vacancy(vacancy_id));
create policy criteria_member_read on public.scorecard_criteria for select to authenticated
  using (public.can_see_vacancy(vacancy_id));
create policy ads_member_read on public.job_ads for select to authenticated
  using (public.can_see_vacancy(vacancy_id));
-- No customer access to campaigns (budget) or ad_costs: with fixed-price and
-- media-markup pricing, raw media spend would reveal the margin. The portal
-- shows "cost per qualified candidate" computed server-side from the price.
create policy accounts_member_read on public.ad_accounts for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

-- Bewerbungen erst ab Shortlist
create policy applications_member_read on public.applications for select to authenticated
  using (public.customer_can_see_application(id));
create policy candidates_member_read on public.candidates for select to authenticated
  using (exists (
    select 1 from public.applications ap
    where ap.candidate_id = candidates.id and public.customer_can_see_application(ap.id)
  ));
create policy answers_member_read on public.screening_answers for select to authenticated
  using (public.customer_can_see_application(application_id));
create policy ratings_member_read on public.scorecard_ratings for select to authenticated
  using (public.customer_can_see_application(application_id));
create policy feedback_member_read on public.customer_feedback for select to authenticated
  using (public.customer_can_see_application(application_id));
create policy feedback_member_create on public.customer_feedback for insert to authenticated
  with check (public.customer_can_see_application(application_id) and created_by = auth.uid());

-- ---------------------------------------------------------------
-- Private Storage-Buckets für Lebensläufe und Verträge
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('contracts', 'contracts', false)
on conflict (id) do nothing;
