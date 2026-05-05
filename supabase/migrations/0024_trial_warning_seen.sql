-- Phase 3: trial warning modal dismiss state (workspace-level)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'trial_warning_threshold') then
    create type trial_warning_threshold as enum ('t_minus_7', 't_minus_3', 't_minus_1');
  end if;
end $$;

create table if not exists public.trial_warning_seen (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  threshold trial_warning_threshold not null,
  seen_at timestamptz not null default now(),
  dismissed boolean not null default false,
  primary key (workspace_id, threshold)
);

alter table public.trial_warning_seen enable row level security;

-- Any member can dismiss / record modal views for their workspace trial UX
drop policy if exists trial_warning_seen_all_member on public.trial_warning_seen;
create policy trial_warning_seen_all_member
on public.trial_warning_seen
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);
