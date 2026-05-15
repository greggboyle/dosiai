-- =============================================================================
-- DOSI.AI — consolidated database schema (all migrations in order)
-- Source: supabase/migrations/0001 … 0024
-- Apply to a fresh Postgres database (e.g. supabase db reset / psql).
--
-- Later files intentionally replace or extend earlier ones (e.g. 0005/0006 fix
-- audit_insert and RLS helpers). Keep this order when applying as one script.
-- Requires standard Supabase roles: auth.users, auth.uid(), auth.jwt(), etc.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0001_foundation.sql
-- ---------------------------------------------------------------------------

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
  auto_briefs_auto_approve boolean not null default true,
  daily_intelligence_sweep_hour_utc smallint not null default 17,
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


-- ---------------------------------------------------------------------------
-- 0002_competitor_topic_stubs.sql
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'competitor_status') then
    create type competitor_status as enum ('active', 'archived', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'competitor_tier') then
    create type competitor_tier as enum ('primary_direct', 'secondary_indirect', 'emerging', 'adjacent', 'watching');
  end if;
  if not exists (select 1 from pg_type where typname = 'topic_status') then
    create type topic_status as enum ('active', 'archived');
  end if;
end
$$;

create table if not exists public.competitor (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name text not null,
  website text,
  source text,
  status competitor_status not null default 'active',
  tier competitor_tier not null default 'primary_direct',
  created_at timestamptz not null default now()
);

create index if not exists idx_competitor_workspace on public.competitor(workspace_id);

create table if not exists public.topic (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name text not null,
  description text,
  status topic_status not null default 'active',
  created_by_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_topic_workspace on public.topic(workspace_id);

alter table public.competitor enable row level security;
alter table public.topic enable row level security;

drop policy if exists competitor_select_member_scope on public.competitor;
create policy competitor_select_member_scope
on public.competitor
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists competitor_insert_analyst_or_admin on public.competitor;
create policy competitor_insert_analyst_or_admin
on public.competitor
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_update_analyst_or_admin on public.competitor;
create policy competitor_update_analyst_or_admin
on public.competitor
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_delete_admin_only on public.competitor;
create policy competitor_delete_admin_only
on public.competitor
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

drop policy if exists topic_select_member_scope on public.topic;
create policy topic_select_member_scope
on public.topic
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists topic_insert_analyst_or_admin on public.topic;
create policy topic_insert_analyst_or_admin
on public.topic
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists topic_update_analyst_or_admin on public.topic;
create policy topic_update_analyst_or_admin
on public.topic
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists topic_delete_admin_only on public.topic;
create policy topic_delete_admin_only
on public.topic
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

-- ---------------------------------------------------------------------------
-- 0003_workspace_profile.sql
-- ---------------------------------------------------------------------------

create table if not exists public.workspace_profile (
  workspace_id uuid primary key references public.workspace(id) on delete cascade,
  company_name text,
  company_website text,
  company_summary text,
  icp text,
  industry text,
  geography text,
  legal_name text,
  primary_url text,
  product_names text[] default '{}'::text[],
  brand_aliases text[] default '{}'::text[],
  founded_year integer,
  headquarters text,
  geography_served text[] default '{}'::text[],
  icp_description text,
  value_props text[] default '{}'::text[],
  differentiators text[] default '{}'::text[],
  social_handles jsonb default '{}'::jsonb,
  press_kit_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.set_workspace_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_workspace_profile_updated_at on public.workspace_profile;
create trigger set_workspace_profile_updated_at
before update on public.workspace_profile
for each row
execute function public.set_workspace_profile_updated_at();

alter table public.workspace_profile enable row level security;

drop policy if exists workspace_profile_select_member_scope on public.workspace_profile;
create policy workspace_profile_select_member_scope
on public.workspace_profile
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_profile_insert_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_insert_analyst_or_admin
on public.workspace_profile
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists workspace_profile_update_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_update_analyst_or_admin
on public.workspace_profile
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- ---------------------------------------------------------------------------
-- 0004_audit_triggers.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 0005_fix_audit_insert_resolution.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 0006_workspace_member_rls_helpers_and_audit.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 0009_enable_pgvector.sql
-- ---------------------------------------------------------------------------

-- pgvector for embeddings (intelligence_item, competitor, topic, workspace_profile)
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 0010_ingestion_engine.sql
-- ---------------------------------------------------------------------------

-- Phase 2: ingestion engine — core tables, profile extensions, RLS, cost trigger

-- Audit category for AI routing / prompts
do $$
begin
  begin
    alter type audit_category add value 'ai_routing';
  exception
    when duplicate_object then null;
  end;
end $$;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sweep_trigger') then
    create type sweep_trigger as enum ('manual', 'scheduled');
  end if;
  if not exists (select 1 from pg_type where typname = 'sweep_status') then
    create type sweep_status as enum ('running', 'completed', 'failed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'intelligence_visibility') then
    create type intelligence_visibility as enum ('feed', 'filtered', 'dismissed');
  end if;
  if not exists (select 1 from pg_type where typname = 'item_user_status') then
    create type item_user_status as enum ('new', 'read', 'bookmarked');
  end if;
  if not exists (select 1 from pg_type where typname = 'ai_vendor') then
    create type ai_vendor as enum ('openai', 'anthropic', 'xai');
  end if;
  if not exists (select 1 from pg_type where typname = 'ai_purpose') then
    create type ai_purpose as enum (
      'sweep_buy',
      'sweep_sell',
      'sweep_channel',
      'sweep_regulatory',
      'sweep_self',
      'sweep_topic',
      'competitor_profile_refresh',
      'scoring',
      'embedding',
      'brief_drafting_all',
      'battle_card_interview'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'prompt_template_status') then
    create type prompt_template_status as enum ('active', 'draft', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'topic_importance') then
    create type topic_importance as enum ('critical', 'high', 'medium', 'low');
  end if;
  if not exists (select 1 from pg_type where typname = 'suggested_competitor_status') then
    create type suggested_competitor_status as enum ('pending', 'confirmed', 'rejected');
  end if;
end $$;

-- Workspace: sweep + scoring fields
alter table public.workspace
  add column if not exists last_sweep_at timestamptz,
  add column if not exists last_hiring_sweep_at timestamptz,
  add column if not exists review_queue_threshold integer not null default 30,
  add column if not exists scoring_weights jsonb not null default '{}'::jsonb,
  add column if not exists auto_briefs_auto_approve boolean not null default true,
  add column if not exists daily_intelligence_sweep_hour_utc smallint not null default 17;

do $$
begin
  alter table public.workspace
    add constraint workspace_daily_intelligence_sweep_hour_utc_check
    check (daily_intelligence_sweep_hour_utc between 0 and 23);
exception
  when duplicate_object then null;
end $$;

-- workspace_profile: embeddings + segments
alter table public.workspace_profile
  add column if not exists embedding vector(1536),
  add column if not exists differentiators_embedding vector(1536),
  add column if not exists segment_relevance text[] default '{}'::text[],
  add column if not exists summary_embedding vector(1536),
  add column if not exists value_prop_embedding vector(1536);

-- Competitor: full profile + embedding
alter table public.competitor
  add column if not exists positioning text,
  add column if not exists icp_description text,
  add column if not exists pricing_model text,
  add column if not exists pricing_notes text,
  add column if not exists founded_year integer,
  add column if not exists hq_location text,
  add column if not exists employee_count_estimate integer,
  add column if not exists funding_status text,
  add column if not exists leadership jsonb,
  add column if not exists products jsonb,
  add column if not exists strengths text[],
  add column if not exists weaknesses text[],
  add column if not exists segment_relevance text[] default '{}'::text[],
  add column if not exists discovery_confidence double precision,
  add column if not exists ai_drafted_fields text[] default '{}'::text[],
  add column if not exists embedding vector(1536),
  add column if not exists last_profile_refresh timestamptz,
  add column if not exists last_significant_change_at timestamptz;

create index if not exists idx_competitor_embedding on public.competitor
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64)
  where embedding is not null;

-- Topic: search_seeds, importance, embedding
alter table public.topic
  add column if not exists search_seeds text[] default '{}'::text[],
  add column if not exists importance topic_importance not null default 'medium',
  add column if not exists embedding vector(1536);

create index if not exists idx_topic_embedding on public.topic
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64)
  where embedding is not null;

-- Global AI routing (operator-managed, one row per purpose)
create table if not exists public.ai_routing_config (
  purpose ai_purpose primary key,
  mode text not null check (mode in ('single-vendor', 'multi-vendor')),
  rules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_operator_id uuid references public.operator_user(id) on delete set null
);

-- Prompt templates (global)
create table if not exists public.prompt_template (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose ai_purpose not null,
  vendor ai_vendor not null,
  status prompt_template_status not null default 'draft',
  version integer not null default 1,
  content text not null default '',
  draft_content text,
  draft_note text,
  deployment_history jsonb not null default '[]'::jsonb,
  ab_test jsonb,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_operator_id uuid references public.operator_user(id) on delete set null
);

create index if not exists idx_prompt_template_purpose_vendor on public.prompt_template(purpose, vendor);

-- Re-embed migration tracking
create table if not exists public.embedding_migration_state (
  id uuid primary key default gen_random_uuid(),
  old_model text not null,
  new_model text not null,
  progress_pct integer not null default 0,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Sweeps
create table if not exists public.sweep (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  trigger sweep_trigger not null,
  trigger_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status sweep_status not null default 'running',
  vendors_used jsonb not null default '{}'::jsonb,
  items_found integer not null default 0,
  items_new integer not null default 0,
  items_dedup_collapsed integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  ai_cost_cents integer not null default 0
);

create index if not exists idx_sweep_workspace_started on public.sweep(workspace_id, started_at desc);

-- Vendor calls (AI cost source of truth)
create table if not exists public.vendor_call (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  purpose ai_purpose not null,
  vendor ai_vendor not null,
  model text not null,
  prompt_template_id uuid references public.prompt_template(id) on delete set null,
  prompt_template_version integer,
  request_tokens integer not null default 0,
  response_tokens integer not null default 0,
  cost_cents integer not null default 0,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  citation_count integer not null default 0,
  response_payload jsonb,
  sweep_id uuid references public.sweep(id) on delete set null,
  called_at timestamptz not null default now()
);

create index if not exists idx_vendor_call_workspace_called_at on public.vendor_call(workspace_id, called_at desc);
create index if not exists idx_vendor_call_purpose on public.vendor_call(purpose);

-- Intelligence items
create table if not exists public.intelligence_item (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  sweep_id uuid references public.sweep(id) on delete set null,
  title text not null,
  summary text not null default '',
  content text not null default '',
  full_summary text,
  category text not null check (category in ('buy-side', 'sell-side', 'channel', 'regulatory')),
  subcategory text,
  five_wh jsonb,
  source_urls jsonb not null default '[]'::jsonb,
  source_type text,
  entities_mentioned jsonb,
  vendor_consensus jsonb not null default '{"confirmed":1,"total":1}'::jsonb,
  related_competitors uuid[] not null default '{}'::uuid[],
  related_topics uuid[] not null default '{}'::uuid[],
  mi_score double precision not null,
  mi_score_band text not null,
  mi_score_components jsonb not null default '{}'::jsonb,
  mi_score_explanation text,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  confidence_reason text,
  review_metadata jsonb,
  embedding vector(1536),
  visibility intelligence_visibility not null default 'feed',
  event_at timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  user_notes text,
  dedup_of_item_id uuid references public.intelligence_item(id) on delete set null,
  is_about_self boolean not null default false
);

create index if not exists idx_intel_workspace_ingested on public.intelligence_item(workspace_id, ingested_at desc);
create index if not exists idx_intel_visibility on public.intelligence_item(workspace_id, visibility);
create index if not exists intelligence_item_self_idx
  on public.intelligence_item (workspace_id, is_about_self, ingested_at desc)
  where is_about_self = true;
create index if not exists idx_intel_embedding on public.intelligence_item
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64)
  where embedding is not null;

create table if not exists public.intelligence_item_vendor_call (
  intelligence_item_id uuid not null references public.intelligence_item(id) on delete cascade,
  vendor_call_id uuid not null references public.vendor_call(id) on delete cascade,
  role text not null default 'primary',
  primary key (intelligence_item_id, vendor_call_id)
);

create table if not exists public.item_user_state (
  item_id uuid not null references public.intelligence_item(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status item_user_status not null default 'new',
  is_watching boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

-- Suggested competitors (auto-discovery)
create table if not exists public.suggested_competitor (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name text not null,
  description_snippet text,
  embedding vector(1536),
  source_item_ids uuid[] not null default '{}'::uuid[],
  status suggested_competitor_status not null default 'pending',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_suggested_competitor_workspace_lower_name
  on public.suggested_competitor (workspace_id, lower(name));

create index if not exists idx_suggested_competitor_workspace on public.suggested_competitor(workspace_id);

-- Operator access helper (JWT email must match operator_user)
create or replace function public.auth_is_active_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.operator_user ou
    where lower(ou.email) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      and ou.status = 'active'
  );
$$;

grant execute on function public.auth_is_active_operator() to authenticated;
grant execute on function public.auth_is_active_operator() to anon;

-- Cost increment trigger (defense in depth)
create or replace function public.bump_workspace_ai_cost_from_vendor_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.cost_cents is not null and new.cost_cents > 0 then
    update public.workspace
    set ai_cost_mtd_cents = coalesce(ai_cost_mtd_cents, 0) + new.cost_cents
    where id = new.workspace_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendor_call_bump_ai_cost on public.vendor_call;
create trigger trg_vendor_call_bump_ai_cost
after insert on public.vendor_call
for each row
execute function public.bump_workspace_ai_cost_from_vendor_call();

-- RLS
alter table public.ai_routing_config enable row level security;
alter table public.prompt_template enable row level security;
alter table public.embedding_migration_state enable row level security;
alter table public.sweep enable row level security;
alter table public.vendor_call enable row level security;
alter table public.intelligence_item enable row level security;
alter table public.intelligence_item_vendor_call enable row level security;
alter table public.item_user_state enable row level security;
alter table public.suggested_competitor enable row level security;

-- Operator policies (global config)
drop policy if exists ai_routing_operator_all on public.ai_routing_config;
create policy ai_routing_operator_all
on public.ai_routing_config
for all
using (public.auth_is_active_operator())
with check (public.auth_is_active_operator());

drop policy if exists prompt_template_operator_all on public.prompt_template;
create policy prompt_template_operator_all
on public.prompt_template
for all
using (public.auth_is_active_operator())
with check (public.auth_is_active_operator());

drop policy if exists embedding_migration_operator_all on public.embedding_migration_state;
create policy embedding_migration_operator_all
on public.embedding_migration_state
for all
using (public.auth_is_active_operator())
with check (public.auth_is_active_operator());

-- Workspace member policies
drop policy if exists sweep_select_member on public.sweep;
create policy sweep_select_member
on public.sweep
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists sweep_insert_service_context on public.sweep;
-- Inserts typically from service role / edge functions
create policy sweep_insert_service_context
on public.sweep
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists sweep_update_member on public.sweep;
create policy sweep_update_member
on public.sweep
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists vendor_call_select_member on public.vendor_call;
create policy vendor_call_select_member
on public.vendor_call
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists vendor_call_insert_member on public.vendor_call;
create policy vendor_call_insert_member
on public.vendor_call
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- Service role bypasses RLS; Inngest uses admin client — add permissive insert for automation via SECURITY DEFINER functions or use service role only.
-- Allow analyst/admin to insert vendor_call for now (sweep code uses admin client in production).

drop policy if exists intelligence_item_select_member on public.intelligence_item;
create policy intelligence_item_select_member
on public.intelligence_item
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists intelligence_item_insert_member on public.intelligence_item;
create policy intelligence_item_insert_member
on public.intelligence_item
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists intelligence_item_update_member on public.intelligence_item;
create policy intelligence_item_update_member
on public.intelligence_item
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists ii_vc_select_member on public.intelligence_item_vendor_call;
create policy ii_vc_select_member
on public.intelligence_item_vendor_call
for select
using (
  exists (
    select 1 from public.intelligence_item ii
    where ii.id = intelligence_item_id
      and ii.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
  )
);

drop policy if exists ii_vc_insert_member on public.intelligence_item_vendor_call;
create policy ii_vc_insert_member
on public.intelligence_item_vendor_call
for insert
with check (
  exists (
    select 1 from public.intelligence_item ii
    where ii.id = intelligence_item_id
      and ii.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
          and wm.role in ('admin', 'analyst')
      )
  )
);

drop policy if exists item_user_state_own on public.item_user_state;
create policy item_user_state_own
on public.item_user_state
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists suggested_competitor_member on public.suggested_competitor;
create policy suggested_competitor_member
on public.suggested_competitor
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists suggested_competitor_admin on public.suggested_competitor;
create policy suggested_competitor_admin
on public.suggested_competitor
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role = 'admin'
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role = 'admin'
  )
);

-- Seed default routing (OpenAI-heavy; operators override in /admin)
insert into public.ai_routing_config (purpose, mode, rules)
values
  ('sweep_buy', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('sweep_sell', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('sweep_channel', 'single-vendor', '[{"vendor":"xai","model":"grok-4","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('sweep_regulatory', 'multi-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true},{"vendor":"xai","model":"grok-4","isPrimary":false,"isEnabled":true}]'::jsonb),
  ('sweep_self', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('sweep_topic', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('competitor_profile_refresh', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('scoring', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('embedding', 'single-vendor', '[{"vendor":"openai","model":"text-embedding-3-small","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_all', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('battle_card_interview', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb)
on conflict (purpose) do nothing;

-- ---------------------------------------------------------------------------
-- 0020_brief.sql
-- ---------------------------------------------------------------------------

-- Phase 3: brief authoring

do $$
begin
  if not exists (select 1 from pg_type where typname = 'brief_audience') then
    create type brief_audience as enum ('leadership', 'sales', 'product', 'general');
  end if;
  if not exists (select 1 from pg_type where typname = 'brief_priority') then
    create type brief_priority as enum ('critical', 'high', 'medium');
  end if;
  if not exists (select 1 from pg_type where typname = 'brief_status') then
    create type brief_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

create table if not exists public.brief (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  body text not null default '',
  word_count integer not null default 0,
  audience brief_audience not null default 'general',
  priority brief_priority not null default 'medium',
  status brief_status not null default 'draft',
  ai_drafted boolean not null default false,
  human_reviewed boolean not null default false,
  linked_item_ids uuid[] not null default '{}'::uuid[],
  linked_topic_ids uuid[] not null default '{}'::uuid[],
  linked_competitor_ids uuid[] not null default '{}'::uuid[],
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brief_workspace_updated on public.brief(workspace_id, updated_at desc);
create index if not exists idx_brief_workspace_status on public.brief(workspace_id, status);
create index if not exists idx_brief_author on public.brief(author_id);

create or replace function public.brief_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_brief_updated_at on public.brief;
create trigger trg_brief_updated_at
before update on public.brief
for each row
execute function public.brief_touch_updated_at();

create table if not exists public.brief_comment (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.brief(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_brief_comment_brief on public.brief_comment(brief_id, created_at desc);

alter table public.brief enable row level security;
alter table public.brief_comment enable row level security;

-- Brief SELECT: published (all members), or draft visible to author or workspace admins
drop policy if exists brief_select_member on public.brief;
create policy brief_select_member
on public.brief
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    status = 'published'
    or author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

drop policy if exists brief_insert_analyst on public.brief;
create policy brief_insert_analyst
on public.brief
for insert
with check (
  author_id = auth.uid()
  and workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists brief_update_author_or_admin on public.brief;
create policy brief_update_author_or_admin
on public.brief
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

drop policy if exists brief_delete_author_or_admin on public.brief;
create policy brief_delete_author_or_admin
on public.brief
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

-- Comments: visible when parent brief is readable; insert by members who can read brief
drop policy if exists brief_comment_select on public.brief_comment;
create policy brief_comment_select
on public.brief_comment
for select
using (
  exists (
    select 1 from public.brief b
    where b.id = brief_comment.brief_id
      and b.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
      and (
        b.status = 'published'
        or b.author_id = auth.uid()
        or exists (
          select 1 from public.workspace_member wm
          where wm.workspace_id = b.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.role = 'admin'
        )
      )
  )
);

drop policy if exists brief_comment_insert on public.brief_comment;
create policy brief_comment_insert
on public.brief_comment
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.brief b
    where b.id = brief_comment.brief_id
      and b.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
      and (
        b.status = 'published'
        or b.author_id = auth.uid()
        or exists (
          select 1 from public.workspace_member wm
          where wm.workspace_id = b.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.role = 'admin'
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- 0021_battle_cards.sql
-- ---------------------------------------------------------------------------

-- Phase 3: battle cards

do $$
begin
  if not exists (select 1 from pg_type where typname = 'battle_card_section_type') then
    create type battle_card_section_type as enum (
      'tldr',
      'why_we_win',
      'why_they_win',
      'objections',
      'trap_setters',
      'proof_points',
      'pricing',
      'recent_activity',
      'talk_tracks'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'battle_card_status') then
    create type battle_card_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

create table if not exists public.battle_card (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  competitor_id uuid not null references public.competitor(id) on delete cascade,
  segment_tag text,
  status battle_card_status not null default 'draft',
  version integer not null default 1,
  owner_id uuid references auth.users(id) on delete set null,
  freshness_score integer,
  interview_state jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_battle_card_workspace on public.battle_card(workspace_id, updated_at desc);
create index if not exists idx_battle_card_competitor on public.battle_card(competitor_id);

create table if not exists public.battle_card_section (
  id uuid primary key default gen_random_uuid(),
  battle_card_id uuid not null references public.battle_card(id) on delete cascade,
  section_type battle_card_section_type not null,
  content jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  last_reviewed_at timestamptz,
  last_contributor_id uuid references auth.users(id) on delete set null,
  ai_drafted boolean not null default false,
  source_item_ids uuid[] not null default '{}'::uuid[],
  feedback_count integer not null default 0,
  gap_count integer not null default 0,
  unique (battle_card_id, section_type)
);

create index if not exists idx_battle_card_section_card on public.battle_card_section(battle_card_id, display_order);

create table if not exists public.battle_card_share_link (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  battle_card_id uuid not null references public.battle_card(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_battle_card_share_card on public.battle_card_share_link(battle_card_id);
create index if not exists idx_battle_card_share_expires on public.battle_card_share_link(expires_at) where revoked_at is null;

create or replace function public.battle_card_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_battle_card_updated_at on public.battle_card;
create trigger trg_battle_card_updated_at
before update on public.battle_card
for each row
execute function public.battle_card_touch_updated_at();

alter table public.battle_card enable row level security;
alter table public.battle_card_section enable row level security;
alter table public.battle_card_share_link enable row level security;

drop policy if exists battle_card_select_member on public.battle_card;
create policy battle_card_select_member
on public.battle_card
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists battle_card_insert_analyst on public.battle_card;
create policy battle_card_insert_analyst
on public.battle_card
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists battle_card_update_analyst on public.battle_card;
create policy battle_card_update_analyst
on public.battle_card
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists battle_card_delete_admin on public.battle_card;
create policy battle_card_delete_admin
on public.battle_card
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists battle_card_section_all_member on public.battle_card_section;
create policy battle_card_section_all_member
on public.battle_card_section
for all
using (
  exists (
    select 1 from public.battle_card bc
    where bc.id = battle_card_section.battle_card_id
      and bc.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
  )
)
with check (
  exists (
    select 1 from public.battle_card bc
    where bc.id = battle_card_section.battle_card_id
      and bc.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
          and wm.role in ('admin', 'analyst')
      )
  )
);

-- Share links: admins manage; members can read metadata for UI
drop policy if exists battle_card_share_select on public.battle_card_share_link;
create policy battle_card_share_select
on public.battle_card_share_link
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists battle_card_share_write_analyst on public.battle_card_share_link;
create policy battle_card_share_write_analyst
on public.battle_card_share_link
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- Public read for valid share token via security definer — handled in app with service role;
-- optional: anon policy on share route uses RPC — omitted here.

-- ---------------------------------------------------------------------------
-- 0022_win_loss.sql
-- ---------------------------------------------------------------------------

-- Phase 3: win/loss outcomes

do $$
begin
  if not exists (select 1 from pg_type where typname = 'win_loss_outcome_type') then
    create type win_loss_outcome_type as enum ('won', 'lost', 'no_decision', 'disqualified');
  end if;
  if not exists (select 1 from pg_type where typname = 'win_loss_source') then
    create type win_loss_source as enum ('manual', 'crm_sync');
  end if;
end $$;

create table if not exists public.workspace_reason_tag (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  tag text not null,
  usage_count integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_reason_tag_ws_lower
  on public.workspace_reason_tag (workspace_id, lower(tag));

create index if not exists idx_workspace_reason_tag_ws on public.workspace_reason_tag(workspace_id) where not archived;

create table if not exists public.win_loss_outcome (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  deal_name text not null,
  competitor_id uuid not null references public.competitor(id) on delete restrict,
  additional_competitor_ids uuid[] not null default '{}'::uuid[],
  outcome win_loss_outcome_type not null,
  deal_size_cents bigint,
  deal_size_band text,
  segment text,
  deal_stage_at_close text,
  close_date date not null default (current_date),
  reason_summary text not null,
  reason_tags text[] not null default '{}'::text[],
  battle_card_id uuid references public.battle_card(id) on delete set null,
  most_helpful_section_type battle_card_section_type,
  missing_section_feedback text,
  notes text,
  source win_loss_source not null default 'manual',
  external_id text,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_win_loss_workspace_close on public.win_loss_outcome(workspace_id, close_date desc);
create index if not exists idx_win_loss_competitor on public.win_loss_outcome(competitor_id);

create table if not exists public.battle_card_section_gap_note (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  battle_card_section_id uuid not null references public.battle_card_section(id) on delete cascade,
  win_loss_outcome_id uuid references public.win_loss_outcome(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gap_note_section on public.battle_card_section_gap_note(battle_card_section_id);

alter table public.workspace_reason_tag enable row level security;
alter table public.win_loss_outcome enable row level security;
alter table public.battle_card_section_gap_note enable row level security;

drop policy if exists workspace_reason_tag_select on public.workspace_reason_tag;
create policy workspace_reason_tag_select
on public.workspace_reason_tag
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists workspace_reason_tag_write_analyst on public.workspace_reason_tag;
create policy workspace_reason_tag_write_analyst
on public.workspace_reason_tag
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- All members can read rows (viewers: application shows aggregates only; analysts see full records)
drop policy if exists win_loss_select_member on public.win_loss_outcome;
create policy win_loss_select_member
on public.win_loss_outcome
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists win_loss_insert_analyst on public.win_loss_outcome;
create policy win_loss_insert_analyst
on public.win_loss_outcome
for insert
with check (
  submitted_by = auth.uid()
  and workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists win_loss_update_analyst on public.win_loss_outcome;
create policy win_loss_update_analyst
on public.win_loss_outcome
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists win_loss_delete_analyst on public.win_loss_outcome;
create policy win_loss_delete_analyst
on public.win_loss_outcome
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists gap_note_select_analyst on public.battle_card_section_gap_note;
create policy gap_note_select_analyst
on public.battle_card_section_gap_note
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists gap_note_insert_analyst on public.battle_card_section_gap_note;
create policy gap_note_insert_analyst
on public.battle_card_section_gap_note
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- ---------------------------------------------------------------------------
-- 0038_competitor_job_posting.sql
-- ---------------------------------------------------------------------------

create table if not exists public.competitor_job_posting (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  competitor_id uuid not null references public.competitor(id) on delete cascade,
  job_url text not null,
  title text not null default '',
  posting_status text not null default 'unknown' check (posting_status in ('open', 'closed', 'unknown')),
  payload jsonb not null default '{}'::jsonb,
  raw_description text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_competitor_job_posting_url
  on public.competitor_job_posting (workspace_id, competitor_id, job_url);

create index if not exists idx_competitor_job_posting_ws_comp_last
  on public.competitor_job_posting (workspace_id, competitor_id, last_seen_at desc);

create index if not exists idx_competitor_job_posting_open
  on public.competitor_job_posting (workspace_id, competitor_id, first_seen_at desc)
  where posting_status = 'open';

alter table public.competitor_job_posting enable row level security;

drop policy if exists competitor_job_posting_select_member on public.competitor_job_posting;
create policy competitor_job_posting_select_member
on public.competitor_job_posting
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists competitor_job_posting_write_analyst on public.competitor_job_posting;
create policy competitor_job_posting_write_analyst
on public.competitor_job_posting
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_job_posting_update_analyst on public.competitor_job_posting;
create policy competitor_job_posting_update_analyst
on public.competitor_job_posting
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_job_posting_delete_analyst on public.competitor_job_posting;
create policy competitor_job_posting_delete_analyst
on public.competitor_job_posting
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

-- ---------------------------------------------------------------------------
-- 0039_deprecate_sweep_umbrella.sql
-- ---------------------------------------------------------------------------

update public.ai_routing_config
set
  rules = '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":false}]'::jsonb,
  updated_at = now()
where purpose = 'sweep_umbrella';

update public.prompt_template
set status = 'archived', updated_at = now()
where purpose = 'sweep_umbrella' and status = 'active';

-- ---------------------------------------------------------------------------
-- 0040_sweep_hiring.sql
-- ---------------------------------------------------------------------------

alter table public.workspace
  add column if not exists last_hiring_sweep_at timestamptz;

do $$
begin
  if exists (select 1 from pg_type where typname = 'ai_purpose')
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'ai_purpose'
         and e.enumlabel = 'sweep_hiring'
     ) then
    alter type public.ai_purpose add value 'sweep_hiring';
  end if;
end $$;

do $$
begin
  insert into public.ai_routing_config (purpose, mode, rules)
  values (
    'sweep_hiring',
    'single-vendor',
    '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb
  )
  on conflict (purpose) do nothing;
exception
  when sqlstate '55P04' then
    raise notice 'ai_purpose enum value sweep_hiring committed in same transaction; re-run script to seed routing row.';
end $$;

-- ---------------------------------------------------------------------------
-- 0023_channels.sql
-- ---------------------------------------------------------------------------

-- Phase 3: channels

do $$
begin
  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type channel_type as enum (
      'publication',
      'conference',
      'podcast',
      'webinar',
      'community',
      'analyst_firm',
      'other'
    );
  end if;
end $$;

create table if not exists public.channel (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  name text not null,
  type channel_type not null default 'other',
  url text,
  authority_score double precision not null default 0.5,
  created_at timestamptz not null default now()
);

drop index if exists idx_channel_workspace_lower_name;
create unique index if not exists idx_channel_workspace_lower_name
  on public.channel (workspace_id, lower(name));

create table if not exists public.channel_appearance (
  item_id uuid not null references public.intelligence_item(id) on delete cascade,
  channel_id uuid not null references public.channel(id) on delete cascade,
  appearance_at timestamptz not null default now(),
  primary key (item_id, channel_id)
);

create index if not exists idx_channel_appearance_channel on public.channel_appearance(channel_id, appearance_at desc);

alter table public.channel enable row level security;
alter table public.channel_appearance enable row level security;

drop policy if exists channel_select_member on public.channel;
create policy channel_select_member
on public.channel
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists channel_write_analyst on public.channel;
create policy channel_write_analyst
on public.channel
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists channel_appearance_select on public.channel_appearance;
create policy channel_appearance_select
on public.channel_appearance
for select
using (
  exists (
    select 1 from public.channel ch
    join public.intelligence_item ii on ii.id = channel_appearance.item_id
    where ch.id = channel_appearance.channel_id
      and ch.workspace_id = ii.workspace_id
      and ii.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
  )
);

drop policy if exists channel_appearance_write_analyst on public.channel_appearance;
create policy channel_appearance_write_analyst
on public.channel_appearance
for all
using (
  exists (
    select 1 from public.channel ch
    join public.intelligence_item ii on ii.id = channel_appearance.item_id
    where ch.id = channel_appearance.channel_id
      and ch.workspace_id = ii.workspace_id
      and ii.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
          and wm.role in ('admin', 'analyst')
      )
  )
)
with check (
  exists (
    select 1 from public.channel ch
    join public.intelligence_item ii on ii.id = channel_appearance.item_id
    where ch.id = channel_appearance.channel_id
      and ch.workspace_id = ii.workspace_id
      and ii.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
          and wm.role in ('admin', 'analyst')
      )
  )
);

-- ---------------------------------------------------------------------------
-- 0024_trial_warning_seen.sql
-- ---------------------------------------------------------------------------

-- Phase 3: trial warning modal dismiss state (workspace-level)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'trial_warning_threshold') then
    create type trial_warning_threshold as enum ('t_minus_7', 't_minus_3', 't_minus_1');
  end if;
end $$;

create table if not exists public.trial_warning_seen (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  threshold trial_warning_threshold not null,
  seen_at timestamptz not null default now(),
  dismissed boolean not null default false,
  primary key (workspace_id, threshold)
);

alter table public.trial_warning_seen enable row level security;

-- Any member can dismiss / record modal views for their workspace trial UX
drop policy if exists trial_warning_seen_all_member on public.trial_warning_seen;
create policy trial_warning_seen_all_member
on public.trial_warning_seen
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- 0042_brief_user_state.sql + 0043_brief_cached_scope_label.sql
-- ---------------------------------------------------------------------------

create table if not exists public.brief_user_state (
  brief_id uuid not null references public.brief(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'saved', 'dismissed')),
  read_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (brief_id, user_id)
);

create index if not exists brief_user_state_user_status_idx
  on public.brief_user_state (user_id, status);

create or replace function public.brief_user_state_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_brief_user_state_updated on public.brief_user_state;
create trigger trg_brief_user_state_updated
before update on public.brief_user_state
for each row
execute function public.brief_user_state_touch_updated_at();

alter table public.brief_user_state enable row level security;

drop policy if exists brief_user_state_select on public.brief_user_state;
create policy brief_user_state_select
on public.brief_user_state
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.brief b
    join public.workspace_member wm on wm.workspace_id = b.workspace_id
    where b.id = brief_user_state.brief_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists brief_user_state_insert on public.brief_user_state;
create policy brief_user_state_insert
on public.brief_user_state
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.brief b
    join public.workspace_member wm on wm.workspace_id = b.workspace_id
    where b.id = brief_user_state.brief_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists brief_user_state_update on public.brief_user_state;
create policy brief_user_state_update
on public.brief_user_state
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.brief b
    join public.workspace_member wm on wm.workspace_id = b.workspace_id
    where b.id = brief_user_state.brief_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

alter table public.brief
  add column if not exists cached_scope_label text;
