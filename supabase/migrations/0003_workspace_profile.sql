create table if not exists public.workspace_profile (
  workspace_id uuid primary key references public.workspace(id) on delete cascade,
  company_name text,
  company_website text,
  company_summary text,
  icp text,
  industry text,
  geography text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_workspace_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_workspace_profile_updated_at on public.workspace_profile;
create trigger set_workspace_profile_updated_at
before update on public.workspace_profile
for each row
execute function public.set_workspace_profile_updated_at();

alter table public.workspace_profile enable row level security;

drop policy if exists workspace_profile_select_member_scope on public.workspace_profile;
create policy workspace_profile_select_member_scope
on public.workspace_profile
for select
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_profile_insert_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_insert_analyst_or_admin
on public.workspace_profile
for insert
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists workspace_profile_update_analyst_or_admin on public.workspace_profile;
create policy workspace_profile_update_analyst_or_admin
on public.workspace_profile
for update
using (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
)
with check (
  workspace_id in (
    select wm.workspace_id
    from public.workspace_member wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);
