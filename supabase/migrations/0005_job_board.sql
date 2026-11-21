-- F1: public job board and Google for Jobs.
-- The board reads active vacancies server-side with an explicit column list
-- (src/lib/jobs), so no anonymous access to vacancies is opened here.

-- Occupational field for filtering; postal code and coordinates for radius search.
alter table public.vacancies
  add column category text check (category in (
    'craft', 'engineering', 'it', 'healthcare', 'social', 'office', 'sales', 'marketing',
    'logistics', 'production', 'hospitality', 'finance_legal', 'construction', 'other'
  )),
  add column postal_code text check (postal_code ~ '^\d{5}$'),
  add column latitude double precision,
  add column longitude double precision,
  -- Confidential searches: when false, the board names recrewted instead of the employer.
  add column employer_visible boolean not null default true;

create index vacancies_active_idx on public.vacancies (status, published_at desc) where status = 'active';

-- German postal codes with coordinates (GeoNames, CC BY 4.0), imported by scripts/import-postal-codes.mjs.
create table public.postal_codes (
  code text not null check (code ~ '^\d{5}$'),
  place text not null,
  latitude double precision not null,
  longitude double precision not null,
  primary key (code, place)
);
create index postal_codes_place_idx on public.postal_codes (lower(place));
alter table public.postal_codes enable row level security;
create policy postal_codes_read on public.postal_codes for select to anon, authenticated using (true);

-- published_at marks when a vacancy first went live; coordinates follow the postal code.
create or replace function private.vacancy_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'filled' and new.filled_at is null then
    new.filled_at := now();
  end if;
  if tg_op = 'INSERT' or new.postal_code is distinct from old.postal_code then
    select p.latitude, p.longitude into new.latitude, new.longitude
    from public.postal_codes p where p.code = new.postal_code
    order by p.place limit 1;
    if new.postal_code is null then
      new.latitude := null;
      new.longitude := null;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.vacancy_before_write() from public, anon, authenticated;

create trigger vacancy_before_write before insert or update on public.vacancies
  for each row execute function private.vacancy_before_write();

-- Briefing sync (0004) now also carries postal code and occupational field.
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
    smin := null; smax := null;
  end if;

  update public.vacancies v set
    title = coalesce(nullif(left(btrim(d ->> 'title'), 150), ''), v.title),
    location = nullif(left(btrim(d ->> 'location'), 150), ''),
    postal_code = case when d ->> 'postalCode' ~ '^\d{5}$' then d ->> 'postalCode' end,
    category = case when d ->> 'category' in (
      'craft', 'engineering', 'it', 'healthcare', 'social', 'office', 'sales', 'marketing',
      'logistics', 'production', 'hospitality', 'finance_legal', 'construction', 'other'
    ) then d ->> 'category' end,
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
