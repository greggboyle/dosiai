-- Competitor-scoped job postings (not intelligence_item; excluded from main feed by design)

create table if not exists public.competitor_job_posting (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  competitor_id uuid not null references public.competitor(id) on delete cascade,
  job_url text not null,
  title text not null default '',
  posting_status text not null default 'unknown' check (posting_status in ('open', 'closed', 'unknown')),
  payload jsonb not null default '{}'::jsonb,
  raw_description text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_competitor_job_posting_url
  on public.competitor_job_posting (workspace_id, competitor_id, job_url);

create index if not exists idx_competitor_job_posting_ws_comp_last
  on public.competitor_job_posting (workspace_id, competitor_id, last_seen_at desc);

create index if not exists idx_competitor_job_posting_open
  on public.competitor_job_posting (workspace_id, competitor_id, first_seen_at desc)
  where posting_status = 'open';

alter table public.competitor_job_posting enable row level security;

drop policy if exists competitor_job_posting_select_member on public.competitor_job_posting;
create policy competitor_job_posting_select_member
on public.competitor_job_posting
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists competitor_job_posting_write_analyst on public.competitor_job_posting;
create policy competitor_job_posting_write_analyst
on public.competitor_job_posting
for insert
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_job_posting_update_analyst on public.competitor_job_posting;
create policy competitor_job_posting_update_analyst
on public.competitor_job_posting
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists competitor_job_posting_delete_analyst on public.competitor_job_posting;
create policy competitor_job_posting_delete_analyst
on public.competitor_job_posting
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);
