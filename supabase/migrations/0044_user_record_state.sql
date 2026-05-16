-- Universal per-user read/save/dismiss state across list surfaces.
-- Includes workspace_id for tenant-scoped RLS (stricter than user_id-only).

create table if not exists public.user_record_state (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  record_type text not null
    check (record_type in (
      'brief', 'intelligence_item', 'competitor', 'topic',
      'win_loss', 'customer_voice', 'channel', 'battle_card'
    )),
  record_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'saved', 'dismissed')),
  read_at timestamptz,
  saved_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (record_type, record_id, user_id)
);

create index if not exists user_record_state_user_status_idx
  on public.user_record_state (user_id, record_type, status);

create index if not exists user_record_state_user_record_idx
  on public.user_record_state (user_id, record_type, record_id);

create index if not exists user_record_state_workspace_idx
  on public.user_record_state (workspace_id);

create or replace function public.user_record_state_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_record_state_updated on public.user_record_state;
create trigger trg_user_record_state_updated
before update on public.user_record_state
for each row
execute function public.user_record_state_touch_updated_at();

-- One-time copy from brief_user_state (dual-table period; do not drop brief_user_state here)
insert into public.user_record_state (
  workspace_id, record_type, record_id, user_id, status, read_at, updated_at
)
select
  b.workspace_id,
  'brief',
  bus.brief_id,
  bus.user_id,
  bus.status,
  bus.read_at,
  bus.updated_at
from public.brief_user_state bus
join public.brief b on b.id = bus.brief_id
on conflict (record_type, record_id, user_id) do nothing;

alter table public.user_record_state enable row level security;

drop policy if exists user_record_state_select on public.user_record_state;
create policy user_record_state_select
on public.user_record_state
for select
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_member wm
    where wm.workspace_id = user_record_state.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists user_record_state_insert on public.user_record_state;
create policy user_record_state_insert
on public.user_record_state
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_member wm
    where wm.workspace_id = user_record_state.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists user_record_state_update on public.user_record_state;
create policy user_record_state_update
on public.user_record_state
for update
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_member wm
    where wm.workspace_id = user_record_state.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_member wm
    where wm.workspace_id = user_record_state.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);
