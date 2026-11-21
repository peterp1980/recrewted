-- 1) Talent pool invitations by recruiters (mail template).
-- 2) Employee referrals: personal links per employee of a customer, followed until hire.

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report', 'pool_invite'));

create table public.referrers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  code text not null unique check (code ~ '^[a-z0-9]{8,16}$'),
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.referrers enable row level security;
create policy staff_all on public.referrers for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.referrers for select to authenticated using (private.is_org_member(organization_id));
create policy member_insert on public.referrers for insert to authenticated with check (private.is_org_member(organization_id));
create policy member_update on public.referrers for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));

alter table public.application_attribution add column referrer_id uuid references public.referrers (id) on delete set null;

-- Referral results per referrer, readable by the customer without seeing applicants who are not shortlisted.
create or replace function public.referral_stats(org uuid)
returns table (referrer_id uuid, applications bigint, shortlisted bigint, hired bigint)
language sql stable security definer set search_path = public as $$
  select r.id,
         count(a.id),
         count(a.id) filter (where a.shortlisted_at is not null),
         count(a.id) filter (where a.status = 'hired')
  from public.referrers r
  left join public.application_attribution att on att.referrer_id = r.id
  left join public.applications a on a.id = att.application_id
  where r.organization_id = org and (private.is_staff() or private.is_org_member(org))
  group by r.id;
$$;
revoke execute on function public.referral_stats(uuid) from public, anon;
grant execute on function public.referral_stats(uuid) to authenticated, service_role;
