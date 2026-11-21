-- AI assistance under the EU AI Act. Recruiting AI is high-risk (Annex III no. 4): the AI only suggests,
-- a person decides, every suggestion is logged with input reference, model, prompt version and time,
-- and the human decision is recorded next to it (human oversight, logs, monitoring).

alter table public.ai_recommendations drop constraint ai_recommendations_kind_check;
alter table public.ai_recommendations add constraint ai_recommendations_kind_check
  check (kind in ('scorecard_rating', 'job_ad_text', 'screening_suggestion', 'criteria_suggestion', 'interview_guide'));

alter table public.ai_recommendations
  add column organization_id uuid references public.organizations (id) on delete cascade,
  add column prompt_version text,
  -- SHA-256 of the exact input sent to the model: proves what the suggestion was based on without copying it again.
  add column input_hash text check (input_hash is null or input_hash ~ '^[0-9a-f]{64}$'),
  add column latency_ms int,
  add column requested_by uuid references public.profiles (id),
  add column status text not null default 'suggested' check (status in ('suggested', 'accepted', 'modified', 'rejected', 'failed')),
  add column final_output jsonb,
  add column decided_at timestamptz,
  add column error text;
create index ai_recommendations_lookup on public.ai_recommendations (kind, application_id, vacancy_id, created_at desc);

-- Decisions are recorded once: a suggestion cannot be decided twice or rewritten afterwards.
create or replace function private.ai_decision_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'suggested' and (new.status is distinct from old.status or new.final_output is distinct from old.final_output) then
    raise exception 'ai_already_decided';
  end if;
  if new.output is distinct from old.output or new.input_ref is distinct from old.input_ref or new.model is distinct from old.model
     or new.input_hash is distinct from old.input_hash or new.created_at is distinct from old.created_at then
    raise exception 'ai_log_immutable';
  end if;
  if new.status <> old.status and new.status in ('accepted', 'modified', 'rejected') then
    new.decided_at := coalesce(new.decided_at, now());
    new.accepted := new.status in ('accepted', 'modified');
  end if;
  return new;
end;
$$;
revoke execute on function private.ai_decision_guard() from public, anon, authenticated;
create trigger ai_decision_guard before update on public.ai_recommendations
  for each row execute function private.ai_decision_guard();

-- Switches per customer: text helpers on by default; rating suggestions only after the customer agreed.
alter table public.organizations
  add column ai_assist boolean not null default true,
  add column ai_scoring boolean not null default false;

-- Monitoring for staff: how often people take, change or reject suggestions, and how far
-- human ratings deviate from suggested ones (signals for drift or automation bias).
create or replace function public.ai_monitoring(since timestamptz default now() - interval '90 days')
returns table (kind text, total bigint, accepted bigint, modified bigint, rejected bigint, open bigint, failed bigint,
               avg_latency_ms numeric, rating_pairs bigint, mean_abs_deviation numeric)
language sql stable security definer set search_path = public as $$
  with base as (
    select * from public.ai_recommendations where created_at >= since and private.is_staff()
  ),
  pairs as (
    select abs((s.value ->> 'rating')::numeric - (f.value ->> 'rating')::numeric) as dev
    from base b
    cross join lateral jsonb_array_elements(coalesce(b.output -> 'ratings', '[]'::jsonb)) s
    join lateral jsonb_array_elements(coalesce(b.final_output -> 'ratings', '[]'::jsonb)) f on f.value ->> 'criterionId' = s.value ->> 'criterionId'
    where b.kind = 'scorecard_rating' and b.status in ('accepted', 'modified')
      and jsonb_typeof(s.value -> 'rating') = 'number' and jsonb_typeof(f.value -> 'rating') = 'number'
  )
  select b.kind, count(*),
         count(*) filter (where b.status = 'accepted'), count(*) filter (where b.status = 'modified'),
         count(*) filter (where b.status = 'rejected'), count(*) filter (where b.status = 'suggested'),
         count(*) filter (where b.status = 'failed'),
         round(avg(b.latency_ms)),
         case when b.kind = 'scorecard_rating' then (select count(*) from pairs) end,
         case when b.kind = 'scorecard_rating' then (select round(avg(dev), 2) from pairs) end
  from base b group by b.kind;
$$;
revoke execute on function public.ai_monitoring(timestamptz) from public, anon;
grant execute on function public.ai_monitoring(timestamptz) to authenticated;

-- An ad draft written with AI keeps the link to its suggestion, so the approval is recorded there.
alter table public.job_ads add column ai_recommendation_id uuid references public.ai_recommendations (id) on delete set null;
