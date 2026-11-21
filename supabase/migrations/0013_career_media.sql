-- Career pages, richer layout: logo, hero image, key figures and employee quotes per customer.
-- Images live in a PUBLIC bucket: they are marketing material meant to be seen.
-- Applicant files never go here (CVs stay in the private 'cvs' bucket).

insert into storage.buckets (id, name, public, file_size_limit)
values ('career-media', 'career-media', true, 5242880)
on conflict (id) do nothing;

update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'career-media';

alter table public.organizations
  add column career_logo_url text check (career_logo_url ~ '^(https://|/)'),
  add column career_hero_url text check (career_hero_url ~ '^(https://|/)'),
  -- [{ "value": "111 Jahre", "label": "Familientradition" }]
  add column career_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(career_facts) = 'array'),
  -- [{ "quote": "...", "name": "...", "role": "...", "photo": "https://..." }]
  add column career_testimonials jsonb not null default '[]'::jsonb check (jsonb_typeof(career_testimonials) = 'array');
