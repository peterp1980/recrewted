-- F9: free job channels (feeds and Google for Jobs), switchable by admins for everyone and per customer.
-- A vacancy goes out on a channel only if the channel is on and the customer has not switched it off.

create table public.job_channels (
  key text primary key check (key ~ '^[a-z0-9_]{2,30}$'),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.job_channels enable row level security;
create policy staff_read on public.job_channels for select to authenticated using (private.is_staff());
create policy admin_update on public.job_channels for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- Google for Jobs and the Indeed feed were live before; the new aggregators start switched off.
insert into public.job_channels (key, enabled) values
  ('google', true), ('indeed', true), ('jooble', false), ('talent', false), ('adzuna', false),
  ('careerjet', false), ('jobrapido', false), ('kimeta', false), ('linkedin', false), ('ba', false);

create table public.organization_channels (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel text not null references public.job_channels (key) on delete cascade,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, channel)
);
alter table public.organization_channels enable row level security;
create policy staff_read on public.organization_channels for select to authenticated using (private.is_staff());
create policy admin_write on public.organization_channels for all to authenticated using (private.is_admin()) with check (private.is_admin());
