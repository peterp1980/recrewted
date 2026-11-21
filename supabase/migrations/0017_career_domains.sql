-- Own domains for career pages (e.g. karriere.hafermann-reisen.de). Hostnames are stored in lower case.
alter table public.organizations
  add column career_domain text unique
    check (career_domain ~ '^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
           and career_domain !~ '(^|\.)recrewted\.de$' and career_domain !~ '\.vercel\.app$');

-- The middleware maps a request's host to a career page. It runs before any login, so it uses the
-- public API key: this function reveals only the short name of a published page, nothing else.
create or replace function public.career_slug_for_host(host text) returns text
language sql stable security definer set search_path = public as $$
  select o.slug from public.organizations o
  join public.career_pages p on p.organization_id = o.id
  where o.career_domain = lower(host) and o.career_enabled and p.published is not null
  limit 1;
$$;
revoke execute on function public.career_slug_for_host(text) from public;
grant execute on function public.career_slug_for_host(text) to anon, authenticated, service_role;
