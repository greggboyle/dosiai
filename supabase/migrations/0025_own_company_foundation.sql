-- Phase 2.5 foundation for own-company sweep (`sweep_self`)

-- Add new ai_purpose enum value for routing/prompt/vendor call typing.
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

-- Seed default routing row for own-company sweep (single vendor by default).
insert into public.ai_routing_config (purpose, mode, rules)
values (
  'sweep_self',
  'single-vendor',
  '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb
)
on conflict (purpose) do nothing;

-- Extend workspace_profile with own-company sweep inputs.
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
