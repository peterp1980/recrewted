-- Handover to the customer's applicant tracking system (Personio & Co.).
-- One connection per customer, switched on by the customer or recrewted, with the customer's API key.
-- The key is stored encrypted by the app (AES-GCM); the database never sees it in plain text and
-- signed-in users cannot read even the ciphertext (column privileges below).

create table public.ats_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('personio', 'recruitee', 'smartrecruiters', 'lever', 'bamboohr', 'webhook')),
  enabled boolean not null default false,
  -- When a candidate is handed over automatically: on shortlist, on "get to know" (interview/hired), or only by button.
  trigger_on text not null default 'interview' check (trigger_on in ('shortlist', 'interview', 'manual')),
  -- Non-secret settings: company id, subdomain, webhook URL, channel id, ...
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  secret_enc text,
  secret_hint text check (secret_hint is null or char_length(secret_hint) <= 8),
  last_test_at timestamptz,
  last_test_ok boolean,
  last_error text,
  -- Open jobs read during the last connection test, offered as a dropdown for mapping vacancies.
  remote_jobs jsonb not null default '[]'::jsonb check (jsonb_typeof(remote_jobs) = 'array'),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.ats_connections enable row level security;
create policy staff_read on public.ats_connections for select to authenticated using (private.is_staff());
create policy member_read on public.ats_connections for select to authenticated using (private.is_org_member(organization_id));
-- Writes only via server actions (service role) after the app checked staff or membership.
revoke all on public.ats_connections from anon, authenticated;
grant select (id, organization_id, provider, enabled, trigger_on, config, secret_hint, last_test_at, last_test_ok, last_error, remote_jobs, updated_by, updated_at, created_at)
  on public.ats_connections to authenticated;

-- Job in the customer's ATS that a vacancy maps to (Personio job_position_id, Recruitee offer id, ...).
alter table public.vacancies add column ats_job_id text check (ats_job_id is null or char_length(ats_job_id) between 1 and 100);

create table public.ats_transfers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  connection_id uuid not null references public.ats_connections (id) on delete cascade,
  provider text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  external_id text,
  error text,
  requested_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (application_id, connection_id)
);
alter table public.ats_transfers enable row level security;
create policy staff_all on public.ats_transfers for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.ats_transfers for select to authenticated using (private.customer_can_see_application(application_id));
create index ats_transfers_pending on public.ats_transfers (created_at) where status = 'pending';

-- Automatic handover by status, so every path (recruiter, customer feedback) is covered.
create or replace function private.queue_ats_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conn public.ats_connections;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  select c.* into conn from public.ats_connections c
  join public.vacancies v on v.organization_id = c.organization_id
  where v.id = new.vacancy_id and c.enabled;
  if conn.id is null then
    return null;
  end if;
  if (conn.trigger_on = 'shortlist' and new.status in ('shortlisted', 'interview', 'hired'))
     or (conn.trigger_on = 'interview' and new.status in ('interview', 'hired')) then
    insert into public.ats_transfers (application_id, connection_id, provider)
    values (new.id, conn.id, conn.provider)
    on conflict (application_id, connection_id) do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.queue_ats_transfer() from public, anon, authenticated;
create trigger queue_ats_transfer after update of status on public.applications
  for each row execute function private.queue_ats_transfer();

-- Worker claims pending transfers (cron and right after a status change).
create or replace function public.claim_ats_transfers(max_count int default 20) returns setof public.ats_transfers
language sql security definer set search_path = public as $$
  update public.ats_transfers t set attempts = t.attempts + 1
  where t.id in (
    select id from public.ats_transfers
    where status = 'pending' and attempts < 5
    order by created_at
    limit max_count
    for update skip locked
  )
  returning t.*;
$$;
revoke execute on function public.claim_ats_transfers(int) from public, anon, authenticated;
grant execute on function public.claim_ats_transfers(int) to service_role;
