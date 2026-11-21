-- F4 scorecard and status events (used by F5/F6/F12).

-- The rater is always the signed-in user, not a value sent by the client.
create or replace function private.rating_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.rated_by := coalesce(auth.uid(), new.rated_by);
  new.rated_at := now();
  return new;
end;
$$;
revoke execute on function private.rating_stamp() from public, anon, authenticated;
create trigger rating_stamp before insert or update on public.scorecard_ratings
  for each row execute function private.rating_stamp();

-- applications.score = weighted mean (1–5) of all ratings; kept current by the database.
create or replace function private.recompute_score(app uuid) returns void
language sql security definer set search_path = public as $$
  update public.applications a set score = (
    select round(sum(r.rating * c.weight) / nullif(sum(c.weight), 0), 2)
    from public.scorecard_ratings r
    join public.scorecard_criteria c on c.id = r.criterion_id
    where r.application_id = app
  )
  where a.id = app;
$$;
revoke execute on function private.recompute_score(uuid) from public, anon, authenticated;

create or replace function private.ratings_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.recompute_score(coalesce(new.application_id, old.application_id));
  return null;
end;
$$;
revoke execute on function private.ratings_changed() from public, anon, authenticated;
create trigger ratings_changed after insert or update or delete on public.scorecard_ratings
  for each row execute function private.ratings_changed();

-- A changed weight changes the score of every application of that vacancy.
create or replace function private.criteria_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select distinct r.application_id from public.scorecard_ratings r where r.criterion_id = new.id loop
    perform private.recompute_score(a);
  end loop;
  return null;
end;
$$;
revoke execute on function private.criteria_changed() from public, anon, authenticated;
create trigger criteria_changed after update of weight on public.scorecard_criteria
  for each row execute function private.criteria_changed();

-- Status changes write funnel events (docs/tracking.md). Attribution is inherited from the application.
create or replace function private.application_status_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ev text;
  v public.vacancies;
  att public.application_attribution;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  ev := case new.status
    when 'qualified' then 'qualified'
    when 'shortlisted' then 'shortlisted'
    when 'interview' then 'interview_booked'
    when 'hired' then 'hired'
    when 'rejected' then 'withdrawn_or_rejected'
    when 'withdrawn' then 'withdrawn_or_rejected'
    else null
  end;
  if ev is null then
    return null;
  end if;
  select * into v from public.vacancies where id = new.vacancy_id;
  select * into att from public.application_attribution where application_id = new.id;
  insert into public.events (name, organization_id, vacancy_id, campaign_id, application_id, ad_account_owner, channel, entry_point, event_id, props)
  values (ev, v.organization_id, v.id, att.campaign_id, new.id, att.ad_account_owner, att.channel, att.entry_point,
          ev || ':' || new.id || ':' || extract(epoch from clock_timestamp())::bigint,
          jsonb_build_object('from', old.status));
  return null;
end;
$$;
revoke execute on function private.application_status_event() from public, anon, authenticated;
create trigger application_status_event after update of status on public.applications
  for each row execute function private.application_status_event();

-- Closing timestamps for rejected/withdrawn/hired applications (deletion deadlines, F20).
create or replace function private.application_closed_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('rejected', 'withdrawn', 'hired', 'knockout_failed') and new.closed_at is null then
    new.closed_at := now();
  elsif new.status not in ('rejected', 'withdrawn', 'hired', 'knockout_failed') then
    new.closed_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function private.application_closed_at() from public, anon, authenticated;
create trigger application_closed_at before update of status on public.applications
  for each row execute function private.application_closed_at();
