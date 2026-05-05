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
