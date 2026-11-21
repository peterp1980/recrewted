-- F13: the briefing (vacancy_briefings.data) is the customer's input. Core
-- fields are copied into the vacancy while the contract is not yet signed,
-- so customers never need (or get) update rights on vacancies themselves.

-- submitted_by always reflects the user who submitted, not a value sent by the client.
create or replace function private.briefing_stamp_submitter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_at is not null
     and (tg_op = 'INSERT' or new.submitted_at is distinct from old.submitted_at) then
    new.submitted_by := coalesce(auth.uid(), new.submitted_by);
  elsif tg_op = 'UPDATE' then
    new.submitted_by := old.submitted_by;
  end if;
  return new;
end;
$$;
revoke execute on function private.briefing_stamp_submitter() from public, anon, authenticated;

create trigger briefing_stamp_submitter before insert or update on public.vacancy_briefings
  for each row execute function private.briefing_stamp_submitter();

create or replace function private.briefing_sync_vacancy() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d jsonb := new.data;
  smin numeric;
  smax numeric;
begin
  smin := case when jsonb_typeof(d -> 'salaryMin') = 'number' then (d ->> 'salaryMin')::numeric end;
  smax := case when jsonb_typeof(d -> 'salaryMax') = 'number' then (d ->> 'salaryMax')::numeric end;
  if smin is not null and smax is not null and smin > smax then
    smin := null; smax := null; -- invalid range is not copied
  end if;

  update public.vacancies v set
    title = coalesce(nullif(left(btrim(d ->> 'title'), 150), ''), v.title),
    location = nullif(left(btrim(d ->> 'location'), 150), ''),
    remote = coalesce(d ->> 'remote', 'onsite') = 'remote',
    employment_type = nullif(d ->> 'employmentType', ''),
    salary_min = smin,
    salary_max = smax,
    salary_period = case when d ->> 'salaryPeriod' in ('hour', 'month', 'year') then d ->> 'salaryPeriod' else 'year' end
  where v.id = new.vacancy_id
    and v.status in ('draft', 'contract_pending');
  return null;
end;
$$;
revoke execute on function private.briefing_sync_vacancy() from public, anon, authenticated;

create trigger briefing_sync_vacancy after insert or update of data on public.vacancy_briefings
  for each row execute function private.briefing_sync_vacancy();
