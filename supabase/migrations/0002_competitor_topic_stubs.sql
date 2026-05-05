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
