-- How candidates are addressed in the application form and mails: formal "Sie" or informal "du".
-- Per customer, because employers differ (agency vs. law firm). Default stays formal.
alter table public.organizations
  add column candidate_tone text not null default 'sie' check (candidate_tone in ('sie', 'du'));
