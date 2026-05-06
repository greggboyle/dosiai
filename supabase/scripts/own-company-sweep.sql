-- =============================================================================
-- Own-Company Sweep (sweep_self) — single runnable DB script
-- =============================================================================
-- This script bundles all schema changes required for:
-- - `sweep_self` AI routing purpose
-- - extended `workspace_profile` fields for own-company monitoring
-- - `intelligence_item.is_about_self` filtering/index support
--
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) AI purpose enum + routing seed
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ai_purpose'
      and e.enumlabel = 'sweep_self'
  ) then
    alter type ai_purpose add value 'sweep_self';
  end if;
end $$;

do $$
begin
  insert into public.ai_routing_config (purpose, mode, rules)
  values (
    'sweep_self',
    'single-vendor',
    '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb
  )
  on conflict (purpose) do nothing;
exception
  when sqlstate '55P04' then
    raise notice 'Skipping ai_routing_config seed for sweep_self in this transaction. Re-run this script once to apply seed row.';
end $$;

-- -----------------------------------------------------------------------------
-- 2) workspace_profile extensions for own-company sweep
-- -----------------------------------------------------------------------------

-- Ensure pgvector is available for embedding columns.
create extension if not exists vector;

alter table public.workspace_profile
  add column if not exists legal_name text,
  add column if not exists primary_url text,
  add column if not exists product_names text[] default '{}'::text[],
  add column if not exists brand_aliases text[] default '{}'::text[],
  add column if not exists founded_year integer,
  add column if not exists headquarters text,
  add column if not exists geography_served text[] default '{}'::text[],
  add column if not exists icp_description text,
  add column if not exists value_props text[] default '{}'::text[],
  add column if not exists differentiators text[] default '{}'::text[],
  add column if not exists social_handles jsonb default '{}'::jsonb,
  add column if not exists press_kit_url text,
  add column if not exists summary_embedding vector(1536),
  add column if not exists value_prop_embedding vector(1536),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 3) intelligence_item self-subject flag + index
-- -----------------------------------------------------------------------------

alter table public.intelligence_item
  add column if not exists is_about_self boolean not null default false;

create index if not exists intelligence_item_self_idx
  on public.intelligence_item (workspace_id, is_about_self, ingested_at desc)
  where is_about_self = true;

