alter table public.intelligence_item
  add column if not exists is_about_self boolean not null default false;

create index if not exists intelligence_item_self_idx
  on public.intelligence_item (workspace_id, is_about_self, ingested_at desc)
  where is_about_self = true;
