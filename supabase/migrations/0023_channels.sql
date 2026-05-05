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
