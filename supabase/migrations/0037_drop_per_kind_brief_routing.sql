-- Brief drafting vendor/model is configured only via `brief_drafting_all` (see plan).
-- Remove redundant per-kind routing rows; prompts remain per-kind on `prompt_template`.
-- Compare via ::text so this runs even if older DBs never added per-kind enum labels (0035).
delete from public.ai_routing_config
where purpose::text in (
  'brief_drafting_manual',
  'brief_drafting_sweep_summary',
  'brief_drafting_daily_summary',
  'brief_drafting_weekly_intelligence',
  'brief_drafting_regulatory_summary',
  'brief_drafting_competitor'
);
