-- Brief drafting vendor/model is configured only via `brief_drafting_all` (see plan).
-- Remove redundant per-kind routing rows; prompts remain per-kind on `prompt_template`.
delete from public.ai_routing_config
where purpose in (
  'brief_drafting_manual'::public.ai_purpose,
  'brief_drafting_sweep_summary'::public.ai_purpose,
  'brief_drafting_daily_summary'::public.ai_purpose,
  'brief_drafting_weekly_intelligence'::public.ai_purpose,
  'brief_drafting_regulatory_summary'::public.ai_purpose,
  'brief_drafting_competitor'::public.ai_purpose
);
