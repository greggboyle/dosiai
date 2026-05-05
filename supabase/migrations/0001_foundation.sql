create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_plan') then
    create type workspace_plan as enum ('trial', 'starter', 'team', 'business', 'enterprise');
  end if;
  if not exists (select 1 from pg_type where typname = 'workspace_status') then
    create type workspace_status as enum ('active', 'read_only', 'grace_period', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'billing_cycle') then
    create type billing_cycle as enum ('monthly', 'annual');
  end if;
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type workspace_role as enum ('admin', 'analyst', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'workspace_seat_type') then
    create type workspace_seat_type as enum ('analyst', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type member_status as enum ('active', 'invited', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'operator_role') then
    create type operator_role as enum ('viewer', 'analyst', 'admin', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'operator_status') then
    create type operator_status as enum ('active', 'disabled');
  end if;
  if not exists (select 1 from pg_type where typname = 'override_type') then
    create type override_type as enum (
      'analyst_seat_cap',
      'competitor_cap',
      'topic_cap',
      'battle_card_cap',
      'ai_cost_ceiling_cents'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_severity') then
    create type audit_severity as enum ('info', 'warn', 'error', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_category') then
    create type audit_category as enum ('system', 'auth', 'billing', 'membership', 'override', 'operator', 'workspace');
  end if;
  if not exists (select 1 from pg_type where typname = 'impersonation_mode') then
    create type impersonation_mode as enum ('read_only', 'write');
  end if;
end
$$;

-- Workspace
create table if not exists public.workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  logo_url text,
  plan workspace_plan not null default 'trial',
  trial_ends_at timestamptz,
  status workspace_status not null default 'active',
  billing_cycle billing_cycle,
  next_billing_date timestamptz,
  grace_period_ends_at timestamptz,
  ai_cost_mtd_cents integer not null default 0,
  ai_cost_ceiling_cents integer not null default 4000,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Workspace member
create table if not exists public.workspace_member (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  role workspace_role not null,
  seat_type workspace_seat_type not null,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  status member_status not null default 'active',
  primary key (user_id, workspace_id)
);

create or replace function public.set_member_seat_type()
returns trigger
language plpgsql
as $$
begin
  if new.role in ('admin', 'analyst') then
    new.seat_type := 'analyst';
  else
    new.seat_type := 'viewer';
  end if;
  return new;
end;
$$;

drop trigger if exists set_member_seat_type_before_write on public.workspace_member;
create trigger set_member_seat_type_before_write
before insert or update of role on public.workspace_member
for each row
execute function public.set_member_seat_type();

create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
as $$
declare
  admin_count integer;
begin
  if old.role = 'admin' and old.status = 'active' then
    select count(*)
      into admin_count
      from public.workspace_member wm
     where wm.workspace_id = old.workspace_id
       and wm.status = 'active'
       and wm.role = 'admin'
       and wm.user_id <> old.user_id;

    if admin_count = 0 then
      raise exception 'Cannot remove or demote the last active admin';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_last_admin_delete on public.workspace_member;
create trigger prevent_last_admin_delete
before delete on public.workspace_member
for each row
execute function public.prevent_last_admin_removal();

create or replace function public.prevent_last_admin_demotion()
returns trigger
language plpgsql
as $$
declare
  admin_count integer;
begin
  if old.role = 'admin'
     and old.status = 'active'
     and (new.role <> 'admin' or new.status <> 'active') then
    select count(*)
      into admin_count
      from public.workspace_member wm
     where wm.workspace_id = old.workspace_id
       and wm.status = 'active'
       and wm.role = 'admin'
       and wm.user_id <> old.user_id;

    if admin_count = 0 then
      raise exception 'Cannot remove or demote the last active admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_admin_update on public.workspace_member;
create trigger prevent_last_admin_update
before update of role, status on public.workspace_member
for each row
execute function public.prevent_last_admin_demotion();

-- Workspace invite
create table if not exists public.workspace_invite (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  email text not null,
  role workspace_role not null,
  invited_by uuid references auth.users(id) on delete set null,
  token uuid not null unique default gen_random_uuid(),
  status invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create index if not exists idx_workspace_invite_workspace on public.workspace_invite(workspace_id);
create index if not exists idx_workspace_invite_email on public.workspace_invite(lower(email));
create index if not exists idx_workspace_invite_token on public.workspace_invite(token);

-- Operator user
create table if not exists public.operator_user (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role operator_role not null,
  mfa_enabled boolean not null default false,
  status operator_status not null default 'active',
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_id uuid references public.operator_user(id) on delete set null
);

-- Workspace override
create table if not exists public.workspace_override (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  type override_type not null,
  original_value text,
  override_value text not null,
  reason text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by_id uuid not null references public.operator_user(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_override_workspace on public.workspace_override(workspace_id);
create index if not exists idx_workspace_override_active on public.workspace_override(workspace_id, is_active);

-- Audit log entry
create table if not exists public.audit_log_entry (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  severity audit_severity not null default 'info',
  category audit_category not null,
  operator_id uuid references public.operator_user(id) on delete set null,
  operator_role text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  target_name text not null,
  reason text,
  before_value text,
  after_value text,
  ip_address inet,
  session_id text
);

create index if not exists idx_audit_log_timestamp on public.audit_log_entry(timestamp desc);
create index if not exists idx_audit_log_category on public.audit_log_entry(category);
create index if not exists idx_audit_log_action on public.audit_log_entry(action);
create index if not exists idx_audit_log_target on public.audit_log_entry(target_type, target_id);

-- Impersonation session
create table if not exists public.impersonation_session (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operator_user(id) on delete cascade,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  mode impersonation_mode not null default 'read_only',
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  approved_by_id uuid references public.operator_user(id) on delete set null
);

create index if not exists idx_impersonation_active on public.impersonation_session(operator_id, ended_at);

-- RLS
alter table public.workspace enable row level security;
alter table public.workspace_member enable row level security;
alter table public.workspace_invite enable row level security;
alter table public.workspace_override enable row level security;
alter table public.operator_user enable row level security;
alter table public.audit_log_entry enable row level security;
alter table public.impersonation_session enable row level security;

-- workspace policies
drop policy if exists workspace_select_by_member on public.workspace;
create policy workspace_select_by_member
on public.workspace
for select
using (
  id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_update_admin_only on public.workspace;
create policy workspace_update_admin_only
on public.workspace
for update
using (
  id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
)
with check (
  id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_insert_service_only on public.workspace;
create policy workspace_insert_service_only
on public.workspace
for insert
with check (auth.role() = 'service_role');

-- workspace_member policies
drop policy if exists workspace_member_select_member_scope on public.workspace_member;
create policy workspace_member_select_member_scope
on public.workspace_member
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_member_update_member_scope on public.workspace_member;
create policy workspace_member_update_member_scope
on public.workspace_member
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_member_insert_admin_only on public.workspace_member;
create policy workspace_member_insert_admin_only
on public.workspace_member
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_member_delete_admin_only on public.workspace_member;
create policy workspace_member_delete_admin_only
on public.workspace_member
for delete
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

-- workspace_invite policies
drop policy if exists workspace_invite_select_admin_only on public.workspace_invite;
create policy workspace_invite_select_admin_only
on public.workspace_invite
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_invite_insert_admin_only on public.workspace_invite;
create policy workspace_invite_insert_admin_only
on public.workspace_invite
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_invite_update_admin_only on public.workspace_invite;
create policy workspace_invite_update_admin_only
on public.workspace_invite
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
);

drop policy if exists workspace_invite_delete_admin_or_invitee on public.workspace_invite;
create policy workspace_invite_delete_admin_or_invitee
on public.workspace_invite
for delete
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = 'admin'
  )
  or lower(email) = (
    select lower(u.email) from auth.users u where u.id = auth.uid()
  )
);

-- Operator and operator-owned tables: customer access denied by default.
-- Explicit deny posture is achieved with no SELECT/INSERT/UPDATE/DELETE policies.

