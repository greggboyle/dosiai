-- Track which AI sweep purpose produced each intelligence row (regulatory briefs use sweep_regulatory-only items).

alter table public.intelligence_item
  add column if not exists ingestion_purpose ai_purpose null;

comment on column public.intelligence_item.ingestion_purpose is
  'AI sweep purpose that produced this row (e.g. sweep_umbrella, sweep_regulatory, sweep_topic, sweep_self).';

create index if not exists idx_intel_workspace_ingestion
  on public.intelligence_item(workspace_id, ingestion_purpose)
  where ingestion_purpose is not null;
