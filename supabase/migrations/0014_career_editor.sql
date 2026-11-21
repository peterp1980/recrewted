-- Career page editor: the page is a document of sections (see src/lib/careers/document.ts).
-- recrewted staff and the customer's own users edit a draft; only staff publish.
-- Settings that are not content (slug, published flag, brand colour, form of address) stay on organizations.

create table public.career_pages (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  draft jsonb not null default '{"v":1,"sections":[]}'::jsonb check (jsonb_typeof(draft) = 'object'),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles (id),
  published_at timestamptz,
  published_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.career_pages enable row level security;

create policy staff_all on public.career_pages for all to authenticated
  using (private.is_staff()) with check (private.is_staff());
create policy member_read on public.career_pages for select to authenticated
  using (private.is_org_member(organization_id));
create policy member_update on public.career_pages for update to authenticated
  using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));

-- Customers may change the draft and ask for review, never publish themselves.
create or replace function private.career_page_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff() and auth.uid() is not null then
    if new.published is distinct from old.published
       or new.published_at is distinct from old.published_at
       or new.published_by is distinct from old.published_by
       -- 'published' without new content is fine: that is discarding the draft.
       or (new.status = 'published' and old.status <> 'published' and new.draft is distinct from new.published) then
      raise exception 'publish_requires_staff' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;
revoke execute on function private.career_page_guard() from public, anon, authenticated;
create trigger career_page_guard before update on public.career_pages
  for each row execute function private.career_page_guard();

-- Every customer gets an (empty) page row, so customers never need insert rights.
create or replace function private.career_page_for_new_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.career_pages (organization_id) values (new.id) on conflict do nothing;
  return null;
end;
$$;
revoke execute on function private.career_page_for_new_org() from public, anon, authenticated;
create trigger career_page_for_new_org after insert on public.organizations
  for each row execute function private.career_page_for_new_org();

-- Move existing content (0011/0013 columns) into documents.
insert into public.career_pages (organization_id, draft, published, status, published_at)
select o.id, d.doc, case when o.career_enabled then d.doc end,
       case when o.career_enabled then 'published' else 'draft' end,
       case when o.career_enabled then now() end
from public.organizations o
cross join lateral (
  select jsonb_build_object('v', 1, 'logoUrl', o.career_logo_url, 'sections', jsonb_path_query_array(jsonb_build_array(
    jsonb_build_object('id', 'hero', 'type', 'hero', 'visible', true, 'data', jsonb_build_object(
      'headline', coalesce(o.career_headline, ''), 'text', coalesce(split_part(coalesce(o.career_intro, ''), E'\n\n', 1), ''), 'imageUrl', o.career_hero_url)),
    case when jsonb_array_length(o.career_facts) > 0 then jsonb_build_object('id', 'facts', 'type', 'facts', 'visible', true, 'data', jsonb_build_object('items', o.career_facts)) end,
    jsonb_build_object('id', 'jobs', 'type', 'jobs', 'visible', true, 'data', jsonb_build_object('title', 'Offene Stellen', 'text', '')),
    case when jsonb_array_length(o.career_benefits) > 0 then jsonb_build_object('id', 'benefits', 'type', 'benefits', 'visible', true, 'data', jsonb_build_object('title', 'Was wir bieten', 'items', o.career_benefits)) end,
    case when position(E'\n\n' in coalesce(o.career_intro, '')) > 0 then jsonb_build_object('id', 'about', 'type', 'text', 'visible', true, 'data', jsonb_build_object(
      'title', 'Über ' || o.name, 'body', substr(o.career_intro, position(E'\n\n' in o.career_intro) + 2))) end,
    case when jsonb_array_length(o.career_testimonials) > 0 then jsonb_build_object('id', 'team', 'type', 'testimonials', 'visible', true, 'data', jsonb_build_object('title', 'Aus dem Team', 'items', o.career_testimonials)) end,
    jsonb_build_object('id', 'contact', 'type', 'contact', 'visible', true, 'data', jsonb_build_object('title', '', 'office', coalesce(o.career_office, ''), 'contact', coalesce(o.career_contact, '')))
  ), '$[*] ? (@ != null)')) as doc
) d
on conflict (organization_id) do nothing;

alter table public.organizations
  drop column career_headline,
  drop column career_intro,
  drop column career_benefits,
  drop column career_office,
  drop column career_contact,
  drop column career_logo_url,
  drop column career_hero_url,
  drop column career_facts,
  drop column career_testimonials;
