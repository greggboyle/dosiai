-- Add dedicated AI prompt/routing purposes for each brief kind.

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

insert into public.ai_routing_config (purpose, mode, rules)
values
  ('brief_drafting_manual', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_sweep_summary', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_daily_summary', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_weekly_intelligence', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_regulatory_summary', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb),
  ('brief_drafting_competitor', 'single-vendor', '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb)
on conflict (purpose) do nothing;
