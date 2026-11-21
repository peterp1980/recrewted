-- Hardening after the Supabase security advisor (lints 0011 and 0029).

-- 1. Trigger functions get a fixed search_path.
alter function public.touch_updated_at() set search_path = public;
alter function public.applications_status_timestamps() set search_path = public;

-- 2. RLS helpers move out of the API-exposed public schema, so they are not
--    callable as /rest/v1/rpc/... . Policies reference functions by OID and
--    keep working after the move; bodies that call other helpers are
--    replaced in place (same OID) to point at the new schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.app_role() set schema private;
alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
alter function public.is_org_member(uuid) set schema private;
alter function public.can_see_vacancy(uuid) set schema private;
alter function public.customer_can_see_application(uuid) set schema private;
alter function public.handle_new_user() set schema private;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.app_role() in ('admin', 'recruiter'), false)
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.app_role() = 'admin', false)
$$;

create or replace function private.can_see_vacancy(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_staff() or exists (
    select 1 from public.vacancies x
    where x.id = v and private.is_org_member(x.organization_id)
  )
$$;

create or replace function private.customer_can_see_application(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications ap
    join public.vacancies v on v.id = ap.vacancy_id
    where ap.id = a
      and ap.shortlisted_at is not null
      and private.is_org_member(v.organization_id)
  )
$$;
