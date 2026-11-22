-- F15 Pipedrive: vacancy <-> deal, status changes mirrored on the deal, contact requests as leads.
-- Everything that goes to Pipedrive is queued here and sent by the server (right away and by the daily cron).
-- Candidate data never goes to Pipedrive: notes carry vacancy facts and counts only.

alter table public.contact_requests add column pipedrive_lead_id text;

create table public.crm_outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('vacancy_status', 'lead')),
  vacancy_id uuid references public.vacancies (id) on delete cascade,
  contact_request_id uuid references public.contact_requests (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check ((kind = 'vacancy_status') = (vacancy_id is not null)),
  check ((kind = 'lead') = (contact_request_id is not null))
);
create index crm_outbox_pending on public.crm_outbox (created_at) where status = 'pending';
alter table public.crm_outbox enable row level security;
create policy staff_read on public.crm_outbox for select to authenticated using (private.is_staff());

-- Status changes of vacancies linked to a deal.
create or replace function private.queue_crm_vacancy_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.pipedrive_deal_id is not null then
    insert into public.crm_outbox (kind, vacancy_id, payload)
    values ('vacancy_status', new.id, jsonb_build_object('from', old.status, 'to', new.status, 'dealId', new.pipedrive_deal_id));
  end if;
  return null;
end;
$$;
revoke execute on function private.queue_crm_vacancy_status() from public, anon, authenticated;
create trigger queue_crm_vacancy_status after update of status on public.vacancies
  for each row execute function private.queue_crm_vacancy_status();

-- New contact requests become leads.
create or replace function private.queue_crm_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.crm_outbox (kind, contact_request_id) values ('lead', new.id);
  return null;
end;
$$;
revoke execute on function private.queue_crm_lead() from public, anon, authenticated;
create trigger queue_crm_lead after insert on public.contact_requests
  for each row execute function private.queue_crm_lead();

create or replace function public.claim_crm_outbox(max_count int default 20) returns setof public.crm_outbox
language sql security definer set search_path = public as $$
  update public.crm_outbox o set attempts = o.attempts + 1
  where o.id in (
    select id from public.crm_outbox
    where status = 'pending' and attempts < 5
    order by created_at
    limit max_count
    for update skip locked
  )
  returning o.*;
$$;
revoke execute on function public.claim_crm_outbox(int) from public, anon, authenticated;
grant execute on function public.claim_crm_outbox(int) to service_role;

-- Reason after a rejection: which answer template was used (criteria, neutral, …), for traceability.
alter table public.feedback_requests add column template text check (template is null or template ~ '^[a-z_]{1,30}$');
