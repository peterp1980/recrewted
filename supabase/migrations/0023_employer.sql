-- Employer features:
-- 1) Team & roles in the portal: owner (manages team and settings), member (works on vacancies),
--    viewer (department: reads shortlisted candidates, comments, gives feedback). Contacts per vacancy.
-- 2) Comments on candidates with @mentions, internal notes for recrewted, questions to recrewted.
-- 3) Notifications: new shortlist to the vacancy's contacts, briefing submitted to recrewted.
-- 4) Employer dashboard and anonymous benchmarks (aggregates only).

alter table public.mail_outbox drop constraint mail_outbox_template_check;
alter table public.mail_outbox add constraint mail_outbox_template_check
  check (template in ('application_received', 'knockout_rejection', 'invite_interview', 'rejection', 'question', 'data_request',
                      'assessment_invite', 'profile_link', 'job_alert', 'status_update', 'weekly_report', 'pool_invite',
                      'team_mention', 'team_shortlist', 'vacancy_request'));

-- ---------------------------------------------------------------
-- 1) Team & roles
-- ---------------------------------------------------------------
alter table public.customer_members
  add column member_role text not null default 'owner' check (member_role in ('owner', 'member', 'viewer')),
  add column invited_by uuid references public.profiles (id),
  add column created_at timestamptz not null default now();

create or replace function private.org_role(org uuid) returns text
language sql stable security definer set search_path = public as $$
  select member_role from public.customer_members where organization_id = org and profile_id = auth.uid()
$$;
revoke execute on function private.org_role(uuid) from public, anon;
grant execute on function private.org_role(uuid) to authenticated;

-- Owners and members change things; viewers only read, comment and give feedback.
create or replace function private.can_edit_org(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.org_role(org) in ('owner', 'member'), false)
$$;
revoke execute on function private.can_edit_org(uuid) from public, anon;
grant execute on function private.can_edit_org(uuid) to authenticated;

drop policy vacancies_member_create on public.vacancies;
create policy vacancies_member_create on public.vacancies for insert to authenticated
  with check (private.can_edit_org(organization_id) and status = 'draft');

drop policy briefings_member_write on public.vacancy_briefings;
create policy briefings_member_write on public.vacancy_briefings for insert to authenticated
  with check (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and private.can_edit_org(v.organization_id) and v.status in ('draft', 'contract_pending')
  ));
drop policy briefings_member_update on public.vacancy_briefings;
create policy briefings_member_update on public.vacancy_briefings for update to authenticated
  using (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and private.can_edit_org(v.organization_id) and v.status in ('draft', 'contract_pending')
  ))
  with check (exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id and private.can_edit_org(v.organization_id) and v.status in ('draft', 'contract_pending')
  ));

drop policy member_update on public.career_pages;
create policy member_update on public.career_pages for update to authenticated
  using (private.can_edit_org(organization_id)) with check (private.can_edit_org(organization_id));

drop policy member_insert on public.referrers;
drop policy member_update on public.referrers;
create policy member_insert on public.referrers for insert to authenticated with check (private.can_edit_org(organization_id));
create policy member_update on public.referrers for update to authenticated
  using (private.can_edit_org(organization_id)) with check (private.can_edit_org(organization_id));

-- Colleagues see who is in their team (names via org_team below). Changes only via server actions (owner checked).
create policy members_org_read on public.customer_members for select to authenticated
  using (private.is_org_member(organization_id));

-- Team list with names and e-mail addresses, for staff and the organization's own members.
create or replace function public.org_team(org uuid)
returns table (profile_id uuid, full_name text, email text, member_role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.profile_id, p.full_name, u.email::text, m.member_role, m.created_at
  from public.customer_members m
  join public.profiles p on p.id = m.profile_id
  left join auth.users u on u.id = m.profile_id
  where m.organization_id = org and (private.is_staff() or private.is_org_member(org))
  order by m.created_at;
$$;
revoke execute on function public.org_team(uuid) from public, anon;
grant execute on function public.org_team(uuid) to authenticated, service_role;

-- Server side only: find an existing account when inviting a colleague.
create or replace function public.user_id_by_email(addr text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(addr) limit 1;
$$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- An organization always keeps at least one owner.
create or replace function private.keep_one_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid := old.organization_id;
begin
  if old.member_role = 'owner'
     and (tg_op = 'DELETE' or new.member_role <> 'owner')
     and exists (select 1 from public.organizations where id = org)
     and not exists (select 1 from public.customer_members where organization_id = org and member_role = 'owner' and profile_id <> old.profile_id) then
    raise exception 'last_owner';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke execute on function private.keep_one_owner() from public, anon, authenticated;
create trigger keep_one_owner before update of member_role or delete on public.customer_members
  for each row execute function private.keep_one_owner();

-- Contacts per vacancy: get notified about new shortlisted candidates.
create table public.vacancy_contacts (
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vacancy_id, profile_id)
);
alter table public.vacancy_contacts enable row level security;
create policy staff_all on public.vacancy_contacts for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.vacancy_contacts for select to authenticated using (private.can_see_vacancy(vacancy_id));
create policy member_write on public.vacancy_contacts for insert to authenticated
  with check (exists (
    select 1 from public.vacancies v join public.customer_members m on m.organization_id = v.organization_id
    where v.id = vacancy_id and private.can_edit_org(v.organization_id) and m.profile_id = vacancy_contacts.profile_id
  ));
create policy member_delete on public.vacancy_contacts for delete to authenticated
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and private.can_edit_org(v.organization_id)));

-- ---------------------------------------------------------------
-- 2) Comments
-- ---------------------------------------------------------------
create table public.application_comments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  author_side text not null check (author_side in ('recrewted', 'customer')),
  body text not null check (char_length(body) between 1 and 4000),
  -- internal: only recrewted sees it; question: a customer asks recrewted something.
  kind text not null default 'comment' check (kind in ('comment', 'internal', 'question')),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index application_comments_app_idx on public.application_comments (application_id, created_at);
alter table public.application_comments enable row level security;
create policy staff_all on public.application_comments for all to authenticated using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.application_comments for select to authenticated
  using (kind <> 'internal' and private.customer_can_see_application(application_id));
create policy member_insert on public.application_comments for insert to authenticated
  with check (kind <> 'internal' and author_id = auth.uid() and private.customer_can_see_application(application_id));

-- Author name and side are set by the database, mentions limited to people who may see the comment,
-- and mentioned people (plus recrewted for questions) get an e-mail.
create or replace function private.comment_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
begin
  select v.organization_id into org from public.applications a join public.vacancies v on v.id = a.vacancy_id where a.id = new.application_id;
  new.author_id := coalesce(auth.uid(), new.author_id);
  select coalesce(nullif(p.full_name, ''), 'Unbekannt'), case when p.role in ('admin', 'recruiter') then 'recrewted' else 'customer' end
    into new.author_name, new.author_side
  from public.profiles p where p.id = new.author_id;
  new.author_side := coalesce(new.author_side, 'customer');
  if new.author_side = 'recrewted' and new.kind = 'question' then
    new.kind := 'comment';
  end if;
  -- Internal notes may only mention recrewted staff; others: staff or members of this customer.
  new.mentions := array(
    select distinct x from unnest(new.mentions) x
    join public.profiles p on p.id = x
    where x <> new.author_id
      and (p.role in ('admin', 'recruiter')
           or (new.kind <> 'internal' and exists (select 1 from public.customer_members m where m.organization_id = org and m.profile_id = x)))
  );
  return new;
end;
$$;
revoke execute on function private.comment_before() from public, anon, authenticated;
create trigger comment_before before insert on public.application_comments
  for each row execute function private.comment_before();

create or replace function private.comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  info record;
begin
  select v.id as vacancy_id, v.title, c.first_name, c.last_name into info
  from public.applications a join public.vacancies v on v.id = a.vacancy_id join public.candidates c on c.id = a.candidate_id
  where a.id = new.application_id;

  insert into public.mail_outbox (to_email, template, data)
  select u.email, 'team_mention',
         jsonb_build_object('firstName', coalesce(split_part(p.full_name, ' ', 1), ''), 'author', new.author_name,
                            'candidate', info.first_name || ' ' || left(info.last_name, 1) || '.', 'jobTitle', info.title,
                            'excerpt', left(new.body, 300), 'applicationId', new.application_id,
                            'staff', p.role in ('admin', 'recruiter'), 'question', new.kind = 'question')
  from public.profiles p join auth.users u on u.id = p.id
  where u.email is not null
    and (p.id = any (new.mentions)
         -- Questions to recrewted go to the recruiting team when nobody specific was mentioned.
         or (new.kind = 'question' and cardinality(new.mentions) = 0 and p.role in ('admin', 'recruiter')))
    and p.id is distinct from new.author_id;
  return null;
end;
$$;
revoke execute on function private.comment_notify() from public, anon, authenticated;
create trigger comment_notify after insert on public.application_comments
  for each row execute function private.comment_notify();

-- People that can be @mentioned on an application: recrewted staff and the customer's team.
create or replace function public.mentionable(app uuid)
returns table (profile_id uuid, full_name text, side text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.full_name, ''), 'Ohne Namen'), 'recrewted'
  from public.profiles p where p.role in ('admin', 'recruiter') and (private.is_staff() or private.customer_can_see_application(app))
  union all
  select p.id, coalesce(nullif(p.full_name, ''), 'Ohne Namen'), 'customer'
  from public.applications a join public.vacancies v on v.id = a.vacancy_id
  join public.customer_members m on m.organization_id = v.organization_id join public.profiles p on p.id = m.profile_id
  where a.id = app and (private.is_staff() or private.customer_can_see_application(app));
$$;
revoke execute on function public.mentionable(uuid) from public, anon;
grant execute on function public.mentionable(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3) Notifications
-- ---------------------------------------------------------------
-- New candidate on the shortlist: the vacancy's contacts (or, without contacts, the customer's owners and members).
create or replace function private.notify_shortlist() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v record;
begin
  if old.shortlisted_at is not null or new.shortlisted_at is null then
    return null;
  end if;
  select va.id, va.title, va.organization_id into v from public.vacancies va where va.id = new.vacancy_id;
  -- One mail per person and vacancy within 30 minutes: several candidates at once become one mail.
  insert into public.mail_outbox (to_email, template, data, send_after)
  select u.email, 'team_shortlist',
         jsonb_build_object('firstName', coalesce(split_part(p.full_name, ' ', 1), ''), 'jobTitle', v.title, 'vacancyId', v.id),
         now() + interval '30 minutes'
  from public.customer_members m join public.profiles p on p.id = m.profile_id join auth.users u on u.id = m.profile_id
  where m.organization_id = v.organization_id and u.email is not null
    and (exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id and c.profile_id = m.profile_id)
         or (not exists (select 1 from public.vacancy_contacts c where c.vacancy_id = v.id) and m.member_role in ('owner', 'member')))
    and not exists (
      select 1 from public.mail_outbox o
      where o.template = 'team_shortlist' and o.to_email = u.email and o.data ->> 'vacancyId' = v.id::text and o.sent_at is null and o.cancelled_at is null
    );
  return null;
end;
$$;
revoke execute on function private.notify_shortlist() from public, anon, authenticated;
create trigger notify_shortlist after update of status, shortlisted_at on public.applications
  for each row execute function private.notify_shortlist();

-- Briefing submitted by a customer: recrewted gets a mail.
create or replace function private.notify_vacancy_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v record;
begin
  if old.submitted_at is not null or new.submitted_at is null or private.is_staff() then
    return null;
  end if;
  select va.id, va.title, o.name as org into v from public.vacancies va join public.organizations o on o.id = va.organization_id where va.id = new.vacancy_id;
  insert into public.mail_outbox (to_email, template, data)
  select u.email, 'vacancy_request', jsonb_build_object('firstName', coalesce(split_part(p.full_name, ' ', 1), ''), 'jobTitle', v.title, 'organization', v.org, 'vacancyId', v.id)
  from public.profiles p join auth.users u on u.id = p.id
  where p.role in ('admin', 'recruiter') and u.email is not null;
  return null;
end;
$$;
revoke execute on function private.notify_vacancy_request() from public, anon, authenticated;
create trigger notify_vacancy_request after update of submitted_at on public.vacancy_briefings
  for each row execute function private.notify_vacancy_request();

-- ---------------------------------------------------------------
-- 4) Dashboard & benchmarks (aggregates only, never single applications)
-- ---------------------------------------------------------------
create or replace function public.employer_dashboard(org uuid)
returns table (vacancy_id uuid, applications bigint, qualified bigint, shortlisted bigint, interviews bigint, hired bigint,
               first_shortlist_days numeric, sources jsonb)
language sql stable security definer set search_path = public as $$
  select v.id,
         count(a.id),
         count(a.id) filter (where a.shortlisted_at is not null or a.status in ('qualified', 'shortlisted', 'interview', 'hired')
                             or exists (select 1 from public.events e where e.application_id = a.id and e.name = 'qualified')),
         count(a.id) filter (where a.shortlisted_at is not null),
         count(a.id) filter (where a.status in ('interview', 'hired')),
         count(a.id) filter (where a.status = 'hired'),
         round(extract(epoch from (min(a.shortlisted_at) - coalesce(v.published_at, v.created_at))) / 86400.0, 1),
         coalesce((
           select jsonb_object_agg(src, n) from (
             select coalesce(att.channel, att.entry_point::text, 'unbekannt') as src, count(*) as n
             from public.applications a2 left join public.application_attribution att on att.application_id = a2.id
             where a2.vacancy_id = v.id group by 1
           ) s
         ), '{}'::jsonb)
  from public.vacancies v
  left join public.applications a on a.vacancy_id = v.id
  where v.organization_id = org and (private.is_staff() or private.is_org_member(org))
  group by v.id;
$$;
revoke execute on function public.employer_dashboard(uuid) from public, anon;
grant execute on function public.employer_dashboard(uuid) to authenticated, service_role;

-- Anonymous comparison per category over all customers except the asking one.
-- Returned only with at least 5 vacancies from at least 3 other customers, so no single customer can be inferred.
create or replace function public.employer_benchmarks(org uuid)
returns table (category text, vacancies bigint, median_shortlist_days numeric, avg_qualified numeric, avg_shortlisted numeric, hire_rate numeric)
language sql stable security definer set search_path = public as $$
  with per as (
    select v.id, v.organization_id, coalesce(v.category, 'other') as category,
           extract(epoch from (min(a.shortlisted_at) - coalesce(v.published_at, v.created_at))) / 86400.0 as days,
           count(a.id) filter (where a.shortlisted_at is not null or a.status in ('qualified', 'shortlisted', 'interview', 'hired')) as qualified,
           count(a.id) filter (where a.shortlisted_at is not null) as shortlisted,
           bool_or(a.status = 'hired') as hired
    from public.vacancies v left join public.applications a on a.vacancy_id = v.id
    where v.organization_id <> org and v.published_at is not null
    group by v.id
  )
  select category, count(*),
         round((percentile_cont(0.5) within group (order by days))::numeric, 1),
         round(avg(qualified), 1), round(avg(shortlisted), 1),
         round(avg(case when hired then 1 else 0 end), 2)
  from per
  where private.is_staff() or private.is_org_member(org)
  group by category
  having count(*) >= 5 and count(distinct organization_id) >= 3;
$$;
revoke execute on function public.employer_benchmarks(uuid) from public, anon;
grant execute on function public.employer_benchmarks(uuid) to authenticated, service_role;
