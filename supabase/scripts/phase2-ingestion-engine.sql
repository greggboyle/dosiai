-- =============================================================================
-- Phase 2 ingestion engine — single runnable script
-- =============================================================================
-- Combines (in order):
--   1) supabase/migrations/0009_enable_pgvector.sql
--   2) supabase/migrations/0010_ingestion_engine.sql
--
-- Prerequisite: Foundation schema must already exist (workspace, workspace_member,
-- workspace_profile, competitor, topic, operator_user, audit_category enum, etc.)
-- from migrations 0001–0008 (or equivalent). This script only adds Phase 2 deltas.
--
-- Safe to run on a DB that already applied 0009/0010 via Supabase migrate (uses
-- IF NOT EXISTS / idempotent patterns where applicable).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part 1 of 2: 0009_enable_pgvector.sql
-- -----------------------------------------------------------------------------

-- pgvector for embeddings (intelligence_item, competitor, topic, workspace_profile)
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Part 2 of 2: 0010_ingestion_engine.sql
-- -----------------------------------------------------------------------------

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
      'sweep_topic',
      'scoring',
      'embedding',
      'brief_drafting',
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
  add column if not exists review_queue_threshold integer not null default 30,
  add column if not exists scoring_weights jsonb not null default '{}'::jsonb;

-- workspace_profile: embeddings + segments
alter table public.workspace_profile
  add column if not exists embedding vector(1536),
  add column if not exists differentiators_embedding vector(1536),
  add column if not exists segment_relevance text[] default '{}'::text[];

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
  dedup_of_item_id uuid references public.intelligence_item(id) on delete set null
);

create index if not exists idx_intel_workspace_ingested on public.intelligence_item(workspace_id, ingested_at desc);
create index if not exists idx_intel_visibility on public.intelligence_item(workspace_id, visibility);
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
  ('sweep_topic', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('scoring', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('embedding', 'single-vendor', '[{"vendor":"openai","model":"text-embedding-3-small","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('battle_card_interview', 'single-vendor', '[{"vendor":"anthropic","model":"claude-opus-4-7","isPrimary":true,"isEnabled":true}]'::jsonb)
on conflict (purpose) do nothing;
