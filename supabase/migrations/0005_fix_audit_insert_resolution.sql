-- PostgreSQL function resolution fails when enum-typed params are passed as
-- untyped string literals (unknown) and when uuid is passed where text is expected.
-- Use text parameters + explicit casts inside audit_insert; cast user ids at call sites.

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
