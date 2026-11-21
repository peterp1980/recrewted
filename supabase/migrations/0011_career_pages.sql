-- Career pages and widget per customer (entry points 'career_page' and 'widget', see 0001).
-- Fixed layout, content per organization – not a page builder (that stays in Release 3).

alter table public.organizations
  add column slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$'),
  add column career_enabled boolean not null default false,
  add column career_headline text check (char_length(career_headline) <= 150),
  add column career_intro text check (char_length(career_intro) <= 2000),
  -- [{ "title": "...", "text": "..." }], at most 12 entries (checked in the app).
  add column career_benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(career_benefits) = 'array'),
  add column career_office text check (char_length(career_office) <= 1000),
  add column career_contact text check (char_length(career_contact) <= 300),
  add column brand_color text check (brand_color ~ '^#[0-9a-fA-F]{6}$');

-- A published career page needs an address.
alter table public.organizations
  add constraint career_needs_slug check (not career_enabled or slug is not null);
