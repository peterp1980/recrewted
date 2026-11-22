-- Google for Jobs: notify Google through the Indexing API when a job goes live, changes or ends,
-- instead of waiting days for the crawler. The server sends the queue (right away and daily).

create table public.indexing_outbox (
  id bigint generated always as identity primary key,
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  kind text not null check (kind in ('updated', 'deleted')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  error text,
  url text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index indexing_outbox_pending on public.indexing_outbox (created_at) where status = 'pending';
alter table public.indexing_outbox enable row level security;
create policy staff_read on public.indexing_outbox for select to authenticated using (private.is_staff());

create or replace function private.queue_indexing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text;
begin
  if new.status = 'active' and (old.status is distinct from 'active'
       or new.title is distinct from old.title or new.location is distinct from old.location
       or new.salary_min is distinct from old.salary_min or new.salary_max is distinct from old.salary_max
       or new.employer_visible is distinct from old.employer_visible or new.remote is distinct from old.remote) then
    k := 'updated';
  elsif old.status = 'active' and new.status is distinct from 'active' then
    k := 'deleted';
  else
    return null;
  end if;
  -- One open entry per vacancy is enough; the newest kind wins.
  delete from public.indexing_outbox where vacancy_id = new.id and status = 'pending';
  insert into public.indexing_outbox (vacancy_id, kind) values (new.id, k);
  return null;
end;
$$;
revoke execute on function private.queue_indexing() from public, anon, authenticated;
create trigger queue_indexing after update on public.vacancies
  for each row execute function private.queue_indexing();

create or replace function public.claim_indexing(max_count int default 50) returns setof public.indexing_outbox
language sql security definer set search_path = public as $$
  update public.indexing_outbox o set attempts = o.attempts + 1
  where o.id in (
    select id from public.indexing_outbox
    where status = 'pending' and attempts < 5
    order by created_at
    limit max_count
    for update skip locked
  )
  returning o.*;
$$;
revoke execute on function public.claim_indexing(int) from public, anon, authenticated;
grant execute on function public.claim_indexing(int) to service_role;
