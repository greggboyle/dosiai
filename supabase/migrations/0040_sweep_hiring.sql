-- Hiring sweep: LLM + web search job postings per competitor (separate from intelligence sweeps).

alter table public.workspace
  add column if not exists last_hiring_sweep_at timestamptz;

do $$
begin
  if exists (select 1 from pg_type where typname = 'ai_purpose')
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'ai_purpose'
         and e.enumlabel = 'sweep_hiring'
     ) then
    alter type public.ai_purpose add value 'sweep_hiring';
  end if;
end $$;

do $$
begin
  insert into public.ai_routing_config (purpose, mode, rules)
  values (
    'sweep_hiring',
    'single-vendor',
    '[{"vendor":"openai","model":"gpt-4o","isPrimary":true,"isEnabled":true}]'::jsonb
  )
  on conflict (purpose) do nothing;
exception
  when sqlstate '55P04' then
    raise notice 'ai_purpose enum value sweep_hiring committed in same transaction; re-run script to seed routing row.';
end $$;
