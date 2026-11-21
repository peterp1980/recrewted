-- F14/F6/F11: customer feedback drives the application status; a hire fills
-- the vacancy; filled or closed vacancies stop their campaigns.

alter table public.vacancies
  add column openings int not null default 1 check (openings > 0),
  -- Agreed price for this vacancy (fixed price or service fee), for "cost per qualified candidate".
  add column price_eur numeric(10, 2) check (price_eur >= 0),
  -- Markup on media spend for service_fee_media_passthrough.
  add column media_markup_pct numeric(5, 2) not null default 0 check (media_markup_pct >= 0);

-- Customer feedback (F6): interview / hired / rejected change the status; fit / no_fit are notes for the recruiter.
create or replace function private.feedback_applies_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target public.application_status;
  v public.vacancies;
begin
  if new.verdict = 'rejected' and coalesce(btrim(new.reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if new.verdict = 'no_fit' and coalesce(btrim(new.reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  target := case new.verdict when 'interview' then 'interview' when 'hired' then 'hired' when 'rejected' then 'rejected' else null end;
  if target is not null then
    update public.applications set status = target where id = new.application_id and status is distinct from target;
  end if;

  select v2.* into v from public.vacancies v2 join public.applications a on a.vacancy_id = v2.id where a.id = new.application_id;
  insert into public.events (name, organization_id, vacancy_id, application_id, event_id, props)
  values ('customer_feedback', v.organization_id, v.id, new.application_id, 'customer_feedback:' || new.id, jsonb_build_object('verdict', new.verdict));
  return null;
end;
$$;
revoke execute on function private.feedback_applies_status() from public, anon, authenticated;
create trigger feedback_applies_status after insert on public.customer_feedback
  for each row execute function private.feedback_applies_status();

-- F11: once enough candidates are hired, the vacancy is filled.
create or replace function private.hire_fills_vacancy() returns trigger
language plpgsql security definer set search_path = public as $$
declare v public.vacancies;
begin
  if new.status = 'hired' and old.status is distinct from 'hired' then
    select * into v from public.vacancies where id = new.vacancy_id;
    if v.status = 'active' and (select count(*) from public.applications where vacancy_id = v.id and status = 'hired') >= v.openings then
      update public.vacancies set status = 'filled' where id = v.id;
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function private.hire_fills_vacancy() from public, anon, authenticated;
create trigger hire_fills_vacancy after update of status on public.applications
  for each row execute function private.hire_fills_vacancy();

-- F11: campaigns follow the vacancy. Paused vacancy → paused campaigns; filled/closed → ended.
-- (Job board, sitemap and feeds read only active vacancies, so they drop out on their own.)
create or replace function private.vacancy_stops_campaigns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('filled', 'closed') and old.status is distinct from new.status then
    update public.campaigns set status = 'ended' where vacancy_id = new.id and status in ('draft', 'running', 'paused');
  elsif new.status = 'paused' and old.status is distinct from 'paused' then
    update public.campaigns set status = 'paused' where vacancy_id = new.id and status = 'running';
  end if;
  return null;
end;
$$;
revoke execute on function private.vacancy_stops_campaigns() from public, anon, authenticated;
create trigger vacancy_stops_campaigns after update of status on public.vacancies
  for each row execute function private.vacancy_stops_campaigns();
