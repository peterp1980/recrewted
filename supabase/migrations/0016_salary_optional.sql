-- Salary is optional for publishing (decision Peter, 21.11.2026). The range check stays.
-- Note: under the EU pay transparency directive candidates must learn the pay range
-- before the interview at the latest; the job ad itself does not have to show it.
alter table public.vacancies drop constraint salary_required_when_active;
