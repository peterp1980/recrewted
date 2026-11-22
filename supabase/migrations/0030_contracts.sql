-- F16 PandaDoc: offers and contracts are created, sent and managed by projx admins only.
-- Customers sign in PandaDoc (no account needed) and download signed PDFs in the portal.

-- Only admins write contracts (policies changed in place; names stay).
alter policy staff_insert on public.contracts with check (private.is_admin());
alter policy staff_update on public.contracts using (private.is_admin()) with check (private.is_admin());

-- "framework": terms + data processing agreement once per customer; afterwards an order confirmation per vacancy.
alter table public.contracts drop constraint contracts_kind_check;
alter table public.contracts add constraint contracts_kind_check
  check (kind in ('offer', 'terms', 'dpa', 'order_confirmation', 'framework'));

alter table public.contracts
  add column name text,
  add column recipient_name text,
  add column recipient_email text,
  add column countersigner_email text,
  add column amount_eur numeric(12, 2),
  add column tokens jsonb not null default '{}'::jsonb,
  add column created_by uuid references public.profiles (id),
  add column sent_at timestamptz,
  add column viewed_at timestamptz,
  add column declined_at timestamptz,
  add column error text,
  add column updated_at timestamptz not null default now();

-- PandaDoc templates per document kind, maintained by admins in the app.
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('offer', 'terms', 'dpa', 'order_confirmation', 'framework')),
  name text not null check (char_length(name) between 2 and 120),
  pandadoc_template_id text not null check (pandadoc_template_id ~ '^[A-Za-z0-9]{10,40}$'),
  -- Role names as defined in the PandaDoc template.
  customer_role text not null default 'Kunde' check (char_length(customer_role) between 1 and 60),
  projx_role text check (projx_role is null or char_length(projx_role) between 1 and 60),
  version text not null default '1' check (char_length(version) between 1 and 30),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index contract_templates_one_active on public.contract_templates (kind) where active;
alter table public.contract_templates enable row level security;
create policy staff_read on public.contract_templates for select to authenticated using (private.is_staff());
create policy admin_write on public.contract_templates for all to authenticated using (private.is_admin()) with check (private.is_admin());
