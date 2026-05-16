-- Per-user brief read/save/dismiss state (replaces brief_user_read).

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

-- Migrate prior read markers (skip if legacy table already removed)
do $migrate_read$
begin
  if to_regclass('public.brief_user_read') is not null then
    insert into public.brief_user_state (brief_id, user_id, status, read_at, updated_at)
    select bur.brief_id, bur.user_id, 'read', bur.read_at, bur.read_at
    from public.brief_user_read bur
    on conflict (brief_id, user_id) do nothing;
  end if;
end $migrate_read$;

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

-- Cut over: remove legacy table (policies require the table to exist)
do $drop_legacy_read$
begin
  if to_regclass('public.brief_user_read') is not null then
    execute 'drop policy if exists brief_user_read_select on public.brief_user_read';
    execute 'drop policy if exists brief_user_read_insert on public.brief_user_read';
    execute 'drop policy if exists brief_user_read_update on public.brief_user_read';
    execute 'drop table public.brief_user_read';
  end if;
end $drop_legacy_read$;
