-- Hard cap on short preview field (AI targets ~35 words; DB enforces max length).

-- Backfill: existing rows may exceed 300 chars (e.g. pre-migration intel or long AI output).
update public.intelligence_item
set summary = left(trim(summary), 300)
where summary is not null
  and char_length(trim(summary)) > 300;

alter table public.intelligence_item
  drop constraint if exists intelligence_item_summary_length_chk;

alter table public.intelligence_item
  add constraint intelligence_item_summary_length_chk
  check (char_length(trim(summary)) <= 300);
