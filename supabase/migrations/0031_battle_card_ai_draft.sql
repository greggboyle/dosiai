-- Battle card AI Draft: routing purpose + generation run tracking + recommendations

do $$
begin
  if exists (select 1 from pg_type where typname = 'ai_purpose')
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'ai_purpose'
         and e.enumlabel = 'battle_card_draft'
     ) then
    alter type public.ai_purpose add value 'battle_card_draft';
  end if;
end $$;

do $$
begin
  insert into public.ai_routing_config (purpose, mode, rules)
  values (
    'battle_card_draft',
    'single-vendor',
    '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb
  )
  on conflict (purpose) do nothing;
exception
  when sqlstate '55P04' then
    raise notice 'ai_purpose enum value battle_card_draft committed in same transaction; re-run script to seed routing row.';
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'battle_card_generation_status') then
    create type battle_card_generation_status as enum ('queued', 'processing', 'ready', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'battle_card_recommendation_status') then
    create type battle_card_recommendation_status as enum ('open', 'accepted', 'dismissed');
  end if;
end $$;

create table if not exists public.battle_card_generation_run (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  battle_card_id uuid not null references public.battle_card(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  routing_purpose ai_purpose not null default 'battle_card_draft',
  vendor ai_vendor,
  model text,
  status battle_card_generation_status not null default 'queued',
  include_intel boolean not null default true,
  selected_resource_ids uuid[] not null default '{}'::uuid[],
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_battle_card_generation_run_card
  on public.battle_card_generation_run (battle_card_id, created_at desc);
create index if not exists idx_battle_card_generation_run_workspace_status
  on public.battle_card_generation_run (workspace_id, status, created_at desc);

create table if not exists public.battle_card_section_recommendation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  battle_card_id uuid not null references public.battle_card(id) on delete cascade,
  battle_card_section_id uuid not null references public.battle_card_section(id) on delete cascade,
  run_id uuid not null references public.battle_card_generation_run(id) on delete cascade,
  section_type text not null,
  suggested_content text not null,
  rationale text,
  citations jsonb not null default '[]'::jsonb,
  confidence double precision,
  status battle_card_recommendation_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_battle_card_recommendation_card
  on public.battle_card_section_recommendation (battle_card_id, created_at desc);
create index if not exists idx_battle_card_recommendation_status
  on public.battle_card_section_recommendation (workspace_id, status, created_at desc);

alter table public.battle_card_generation_run enable row level security;
alter table public.battle_card_section_recommendation enable row level security;

drop policy if exists battle_card_generation_run_select_member on public.battle_card_generation_run;
create policy battle_card_generation_run_select_member
on public.battle_card_generation_run
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists battle_card_generation_run_insert_analyst on public.battle_card_generation_run;
create policy battle_card_generation_run_insert_analyst
on public.battle_card_generation_run
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists battle_card_generation_run_update_analyst on public.battle_card_generation_run;
create policy battle_card_generation_run_update_analyst
on public.battle_card_generation_run
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists battle_card_recommendation_select_member on public.battle_card_section_recommendation;
create policy battle_card_recommendation_select_member
on public.battle_card_section_recommendation
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists battle_card_recommendation_insert_analyst on public.battle_card_section_recommendation;
create policy battle_card_recommendation_insert_analyst
on public.battle_card_section_recommendation
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists battle_card_recommendation_update_analyst on public.battle_card_section_recommendation;
create policy battle_card_recommendation_update_analyst
on public.battle_card_section_recommendation
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));
