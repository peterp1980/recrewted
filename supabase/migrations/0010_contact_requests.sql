-- F21: contact form on the B2B website. Written by the server, read by staff.
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  company text,
  email text not null,
  phone text,
  message text not null check (length(message) between 5 and 3000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;
create policy staff_read on public.contact_requests for select to authenticated using (private.is_staff());
create policy staff_update on public.contact_requests for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy admin_delete on public.contact_requests for delete to authenticated using (private.is_admin());
