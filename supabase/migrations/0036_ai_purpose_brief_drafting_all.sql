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
