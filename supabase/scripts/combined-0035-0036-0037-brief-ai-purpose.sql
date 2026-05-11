-- =============================================================================
-- Combined SQL: migrations 0035 + 0036 + 0037 (brief AI purpose / routing)
-- =============================================================================
-- Run in order as one script (e.g. Supabase SQL editor). Idempotent where the
-- originals are. For CLI `db push`, keep using the separate migration files.
--
--   0035 — Add ai_purpose enum labels for per-kind brief prompt_template rows
--   0036 — Rename brief_drafting → brief_drafting_all
--   0037 — Drop per-kind ai_routing_config rows (vendor/model = brief_drafting_all only)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0035_brief_kind_prompt_purposes.sql
-- -----------------------------------------------------------------------------
-- Add ai_purpose enum labels for per-kind brief prompts (prompt_template.purpose).
--
-- Do NOT insert into ai_routing_config here: PostgreSQL forbids using newly added
-- enum literals in the same transaction as ALTER TYPE ... ADD VALUE (55P04).
-- Brief vendor/model routing uses a single row: brief_drafting_all (see 0036/0037).

do $$
begin
  if exists (select 1 from pg_type where typname = 'ai_purpose') then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_manual'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_manual';
    end if;
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_sweep_summary'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_sweep_summary';
    end if;
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_daily_summary'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_daily_summary';
    end if;
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_weekly_intelligence'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_weekly_intelligence';
    end if;
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_regulatory_summary'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_regulatory_summary';
    end if;
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ai_purpose' and e.enumlabel = 'brief_drafting_competitor'
    ) then
      alter type public.ai_purpose add value 'brief_drafting_competitor';
    end if;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 0036_ai_purpose_brief_drafting_all.sql
-- -----------------------------------------------------------------------------
-- Rename umbrella brief drafting purpose for clarity (per-kind purposes unchanged).

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'ai_purpose'
      and e.enumlabel = 'brief_drafting'
  ) then
    alter type public.ai_purpose rename value 'brief_drafting' to 'brief_drafting_all';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 0037_drop_per_kind_brief_routing.sql
-- -----------------------------------------------------------------------------
-- Brief drafting vendor/model is configured only via `brief_drafting_all`.
-- Remove redundant per-kind routing rows; prompts remain per-kind on `prompt_template`.

delete from public.ai_routing_config
where purpose::text in (
  'brief_drafting_manual',
  'brief_drafting_sweep_summary',
  'brief_drafting_daily_summary',
  'brief_drafting_weekly_intelligence',
  'brief_drafting_regulatory_summary',
  'brief_drafting_competitor'
);
