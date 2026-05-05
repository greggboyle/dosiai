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
