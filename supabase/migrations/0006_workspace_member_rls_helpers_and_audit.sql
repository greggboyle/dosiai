-- 1) RLS infinite recursion: policies on workspace_member (and others) must not
--    subquery public.workspace_member directly. Use SECURITY DEFINER helpers that
--    run as the migration owner (bypasses RLS) so checks do not recurse.
--
-- 2) Re-apply audit_insert fix (idempotent) for DBs that have not run 0005 yet.

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

create or replace function public.user_is_active_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_member wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function public.user_is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_member wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  );
$$;

create or replace function public.user_is_analyst_or_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_member wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  );
$$;

revoke all on function public.user_is_active_member(uuid) from public;
grant execute on function public.user_is_active_member(uuid) to authenticated;
grant execute on function public.user_is_active_member(uuid) to service_role;

revoke all on function public.user_is_workspace_admin(uuid) from public;
grant execute on function public.user_is_workspace_admin(uuid) to authenticated;
grant execute on function public.user_is_workspace_admin(uuid) to service_role;

revoke all on function public.user_is_analyst_or_admin(uuid) from public;
grant execute on function public.user_is_analyst_or_admin(uuid) to authenticated;
grant execute on function public.user_is_analyst_or_admin(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- workspace + workspace_member + workspace_invite policies
-- ---------------------------------------------------------------------------

drop policy if exists workspace_select_by_member on public.workspace;
create policy workspace_select_by_member
on public.workspace
for select
using (public.user_is_active_member(id));

drop policy if exists workspace_update_admin_only on public.workspace;
create policy workspace_update_admin_only
on public.workspace
for update
using (public.user_is_workspace_admin(id))
with check (public.user_is_workspace_admin(id));

drop policy if exists workspace_member_select_member_scope on public.workspace_member;
create policy workspace_member_select_member_scope
on public.workspace_member
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists workspace_member_update_member_scope on public.workspace_member;
create policy workspace_member_update_member_scope
on public.workspace_member
for update
using (public.user_is_active_member(workspace_id))
with check (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_member_insert_admin_only on public.workspace_member;
create policy workspace_member_insert_admin_only
on public.workspace_member
for insert
with check (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_member_delete_admin_only on public.workspace_member;
create policy workspace_member_delete_admin_only
on public.workspace_member
for delete
using (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_invite_select_admin_only on public.workspace_invite;
create policy workspace_invite_select_admin_only
on public.workspace_invite
for select
using (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_invite_insert_admin_only on public.workspace_invite;
create policy workspace_invite_insert_admin_only
on public.workspace_invite
for insert
with check (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_invite_update_admin_only on public.workspace_invite;
create policy workspace_invite_update_admin_only
on public.workspace_invite
for update
using (public.user_is_workspace_admin(workspace_id))
with check (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_invite_delete_admin_or_invitee on public.workspace_invite;
create policy workspace_invite_delete_admin_or_invitee
on public.workspace_invite
for delete
using (
  public.user_is_workspace_admin(workspace_id)
  or lower(email) = (
    select lower(u.email) from auth.users u where u.id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- competitor + topic + workspace_profile policies
-- ---------------------------------------------------------------------------

drop policy if exists competitor_select_member_scope on public.competitor;
create policy competitor_select_member_scope
on public.competitor
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists competitor_insert_analyst_or_admin on public.competitor;
create policy competitor_insert_analyst_or_admin
on public.competitor
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists competitor_update_analyst_or_admin on public.competitor;
create policy competitor_update_analyst_or_admin
on public.competitor
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists competitor_delete_admin_only on public.competitor;
create policy competitor_delete_admin_only
on public.competitor
for delete
using (public.user_is_workspace_admin(workspace_id));

drop policy if exists topic_select_member_scope on public.topic;
create policy topic_select_member_scope
on public.topic
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists topic_insert_analyst_or_admin on public.topic;
create policy topic_insert_analyst_or_admin
on public.topic
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists topic_update_analyst_or_admin on public.topic;
create policy topic_update_analyst_or_admin
on public.topic
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists topic_delete_admin_only on public.topic;
create policy topic_delete_admin_only
on public.topic
for delete
using (public.user_is_workspace_admin(workspace_id));

drop policy if exists workspace_profile_select_member_scope on public.workspace_profile;
create policy workspace_profile_select_member_scope
on public.workspace_profile
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists workspace_profile_insert_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_insert_analyst_or_admin
on public.workspace_profile
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists workspace_profile_update_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_update_analyst_or_admin
on public.workspace_profile
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- audit_insert + member audit trigger (same as 0005; safe to re-run)
-- ---------------------------------------------------------------------------

drop function if exists public.audit_insert(
  public.audit_severity,
  public.audit_category,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.audit_insert(
  p_severity text,
  p_category text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_target_name text,
  p_reason text,
  p_before_value text default null,
  p_after_value text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log_entry (
    severity,
    category,
    operator_id,
    operator_role,
    action,
    target_type,
    target_id,
    target_name,
    reason,
    before_value,
    after_value,
    ip_address,
    session_id
  )
  values (
    p_severity::public.audit_severity,
    p_category::public.audit_category,
    null,
    'system',
    p_action,
    p_target_type,
    p_target_id,
    p_target_name,
    p_reason,
    p_before_value,
    p_after_value,
    null,
    null
  );
end;
$$;

create or replace function public.audit_workspace_member_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_insert(
      'info',
      'membership',
      'member_added',
      'workspace_member',
      new.user_id || ':' || new.workspace_id,
      new.user_id::text,
      'Workspace member added',
      null,
      row_to_json(new)::text
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.audit_insert(
      'warn',
      'membership',
      'member_removed',
      'workspace_member',
      old.user_id || ':' || old.workspace_id,
      old.user_id::text,
      'Workspace member removed',
      row_to_json(old)::text,
      null
    );
    return old;
  end if;
  return null;
end;
$$;
