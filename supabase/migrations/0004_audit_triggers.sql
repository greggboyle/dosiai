create or replace function public.audit_insert(
  p_severity audit_severity,
  p_category audit_category,
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
    p_severity,
    p_category,
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
      new.user_id,
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
      old.user_id,
      'Workspace member removed',
      row_to_json(old)::text,
      null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_workspace_member_insert on public.workspace_member;
create trigger trg_audit_workspace_member_insert
after insert on public.workspace_member
for each row
execute function public.audit_workspace_member_changes();

drop trigger if exists trg_audit_workspace_member_delete on public.workspace_member;
create trigger trg_audit_workspace_member_delete
after delete on public.workspace_member
for each row
execute function public.audit_workspace_member_changes();

create or replace function public.audit_workspace_plan_changes()
returns trigger
language plpgsql
as $$
begin
  if (new.plan is distinct from old.plan)
     or (new.status is distinct from old.status)
     or (new.billing_cycle is distinct from old.billing_cycle) then
    perform public.audit_insert(
      'info',
      'billing',
      'workspace_plan_or_status_changed',
      'workspace',
      new.id::text,
      new.name,
      'Workspace plan, billing cycle, or status changed',
      row_to_json(old)::text,
      row_to_json(new)::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_workspace_plan_changes on public.workspace;
create trigger trg_audit_workspace_plan_changes
after update on public.workspace
for each row
execute function public.audit_workspace_plan_changes();

create or replace function public.audit_workspace_override_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_insert(
      'warn',
      'override',
      'override_created',
      'workspace_override',
      new.id::text,
      new.type::text,
      'Workspace override created',
      null,
      row_to_json(new)::text
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.audit_insert(
      'warn',
      'override',
      'override_updated',
      'workspace_override',
      new.id::text,
      new.type::text,
      'Workspace override updated',
      row_to_json(old)::text,
      row_to_json(new)::text
    );
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_workspace_override_insert on public.workspace_override;
create trigger trg_audit_workspace_override_insert
after insert on public.workspace_override
for each row
execute function public.audit_workspace_override_changes();

drop trigger if exists trg_audit_workspace_override_update on public.workspace_override;
create trigger trg_audit_workspace_override_update
after update on public.workspace_override
for each row
execute function public.audit_workspace_override_changes();

create or replace function public.audit_workspace_invite_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status = 'accepted' and old.status is distinct from new.status then
      perform public.audit_insert(
        'info',
        'membership',
        'invite_accepted',
        'workspace_invite',
        new.id::text,
        new.email,
        'Workspace invite accepted',
        row_to_json(old)::text,
        row_to_json(new)::text
      );
    elsif new.status = 'revoked' and old.status is distinct from new.status then
      perform public.audit_insert(
        'warn',
        'membership',
        'invite_revoked',
        'workspace_invite',
        new.id::text,
        new.email,
        'Workspace invite revoked',
        row_to_json(old)::text,
        row_to_json(new)::text
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_workspace_invite_update on public.workspace_invite;
create trigger trg_audit_workspace_invite_update
after update on public.workspace_invite
for each row
execute function public.audit_workspace_invite_changes();
