-- User management: admins can delete any account, owners can delete their own colleagues' accounts.
-- 1) References to a deleted user become empty instead of blocking the delete. The audit log keeps the id
--    (audit_log.actor has no foreign key), comments keep the author's name.
-- 2) The last owner of a customer stays protected while others are in the team; alone, the account may go.
-- 3) Sign a user out everywhere (sessions and refresh tokens), for "reset access" and locking.

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, a.attnotnull
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass
      and c.confdeltype in ('a', 'r') and array_length(c.conkey, 1) = 1
  loop
    if r.attnotnull then
      execute format('alter table %s alter column %I drop not null', r.tbl, r.col);
    end if;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references public.profiles (id) on delete set null', r.tbl, r.conname, r.col);
  end loop;
end;
$$;

create or replace function private.keep_one_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid := old.organization_id;
begin
  if old.member_role = 'owner'
     and (tg_op = 'DELETE' or new.member_role <> 'owner')
     and exists (select 1 from public.organizations where id = org)
     and not exists (select 1 from public.customer_members where organization_id = org and member_role = 'owner' and profile_id <> old.profile_id)
     -- Somebody else is in the team and could be left without an owner.
     and exists (select 1 from public.customer_members where organization_id = org and profile_id <> old.profile_id) then
    raise exception 'last_owner';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.sign_out_everywhere(uid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.refresh_tokens where user_id = uid::text;
  delete from auth.sessions where user_id = uid;
end;
$$;
revoke execute on function public.sign_out_everywhere(uuid) from public, anon, authenticated;
grant execute on function public.sign_out_everywhere(uuid) to service_role;
