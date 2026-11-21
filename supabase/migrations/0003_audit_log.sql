-- F19: audit log for all changes to applicant data, ratings and contracts.
-- Reads of applicant data are logged by the app (src/lib/audit.ts), because
-- Postgres cannot trigger on SELECT.
--
-- Entries hold IDs, changed column names and status transitions only – no
-- personal content (names, e-mails, answers), so the log itself does not
-- become a second copy of applicant data.

create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id, occurred_at);
create index if not exists audit_log_actor_idx on public.audit_log (actor, occurred_at);

create or replace function private.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
  old_rec jsonb;
  changed text[];
  details jsonb := '{}'::jsonb;
  rid uuid;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_rec := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;

  -- Tables with a composite key are logged against their application.
  rid := coalesce((rec ->> 'id')::uuid, (rec ->> 'application_id')::uuid);

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into changed
    from jsonb_object_keys(rec) k
    where rec -> k is distinct from old_rec -> k;
    if changed is null then
      return null; -- no-op update
    end if;
    details := jsonb_build_object('columns', to_jsonb(changed));
    if 'status' = any (changed) then
      details := details || jsonb_build_object('status', jsonb_build_object('from', old_rec -> 'status', 'to', rec -> 'status'));
    end if;
    if 'rating' = any (changed) then
      details := details || jsonb_build_object('rating', jsonb_build_object('from', old_rec -> 'rating', 'to', rec -> 'rating'));
    end if;
  elsif tg_op = 'INSERT' and rec ? 'status' then
    details := jsonb_build_object('status', rec -> 'status');
  end if;

  if rec ? 'criterion_id' then
    details := details || jsonb_build_object('criterion_id', rec -> 'criterion_id');
  end if;

  insert into public.audit_log (actor, action, table_name, record_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, rid, details);
  return null;
end;
$$;
revoke execute on function private.audit_row_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'candidates', 'applications', 'screening_answers', 'scorecard_ratings',
    'customer_feedback', 'contracts', 'ai_recommendations'
  ] loop
    execute format(
      'create trigger audit_change after insert or update or delete on public.%I
         for each row execute function private.audit_row_change()', t);
  end loop;
end $$;
