-- Deprecate sweep_umbrella: sweeps now use sweep_buy / sweep_sell / sweep_channel / sweep_regulatory separately.
-- Do not drop ai_purpose enum value (historical vendor_call / intelligence_item.ingestion_purpose).

update public.ai_routing_config
set
  rules = '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":false}]'::jsonb,
  updated_at = now()
where purpose = 'sweep_umbrella';

update public.prompt_template
set status = 'archived', updated_at = now()
where purpose = 'sweep_umbrella' and status = 'active';
