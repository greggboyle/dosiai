-- UTC hour (0–23) when the daily intelligence sweep may run (paid workspaces; Inngest hourly tick).

alter table public.workspace
  add column if not exists daily_intelligence_sweep_hour_utc smallint;

update public.workspace
set daily_intelligence_sweep_hour_utc = 17
where daily_intelligence_sweep_hour_utc is null;

alter table public.workspace
  alter column daily_intelligence_sweep_hour_utc set not null,
  alter column daily_intelligence_sweep_hour_utc set default 17;

alter table public.workspace
  drop constraint if exists workspace_daily_intelligence_sweep_hour_utc_check;

alter table public.workspace
  add constraint workspace_daily_intelligence_sweep_hour_utc_check
  check (daily_intelligence_sweep_hour_utc between 0 and 23);
