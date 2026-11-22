-- Customer imprint on own career domains.
-- On a verified customer domain (e.g. karriere.hafermann-reisen.de) the page is the customer's offer,
-- so "Impressum" shows the customer's details. On recrewted.de the projx imprint stays.

alter table public.organizations
  add column imprint text check (imprint is null or char_length(imprint) between 30 and 5000),
  add column imprint_url text check (imprint_url is null or (imprint_url ~ '^https://[^\s]+$' and char_length(imprint_url) <= 300)),
  -- Set by the server once https://<career_domain>/ answers with our signed check; cleared when the domain changes.
  add column career_domain_verified_at timestamptz;

create or replace function private.reset_domain_verification() returns trigger
language plpgsql as $$
begin
  if new.career_domain is distinct from old.career_domain then
    new.career_domain_verified_at := null;
  end if;
  return new;
end;
$$;
create trigger reset_domain_verification before update of career_domain on public.organizations
  for each row execute function private.reset_domain_verification();
