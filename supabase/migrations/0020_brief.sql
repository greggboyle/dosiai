-- Phase 3: brief authoring

do $$
begin
  if not exists (select 1 from pg_type where typname = 'brief_audience') then
    create type brief_audience as enum ('leadership', 'sales', 'product', 'general');
  end if;
  if not exists (select 1 from pg_type where typname = 'brief_priority') then
    create type brief_priority as enum ('critical', 'high', 'medium');
  end if;
  if not exists (select 1 from pg_type where typname = 'brief_status') then
    create type brief_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

create table if not exists public.brief (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  body text not null default '',
  word_count integer not null default 0,
  audience brief_audience not null default 'general',
  priority brief_priority not null default 'medium',
  status brief_status not null default 'draft',
  ai_drafted boolean not null default false,
  human_reviewed boolean not null default false,
  linked_item_ids uuid[] not null default '{}'::uuid[],
  linked_topic_ids uuid[] not null default '{}'::uuid[],
  linked_competitor_ids uuid[] not null default '{}'::uuid[],
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brief_workspace_updated on public.brief(workspace_id, updated_at desc);
create index if not exists idx_brief_workspace_status on public.brief(workspace_id, status);
create index if not exists idx_brief_author on public.brief(author_id);

create or replace function public.brief_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_brief_updated_at on public.brief;
create trigger trg_brief_updated_at
before update on public.brief
for each row
execute function public.brief_touch_updated_at();

create table if not exists public.brief_comment (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.brief(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_brief_comment_brief on public.brief_comment(brief_id, created_at desc);

alter table public.brief enable row level security;
alter table public.brief_comment enable row level security;

-- Brief SELECT: published (all members), or draft visible to author or workspace admins
drop policy if exists brief_select_member on public.brief;
create policy brief_select_member
on public.brief
for select
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    status = 'published'
    or author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

drop policy if exists brief_insert_analyst on public.brief;
create policy brief_insert_analyst
on public.brief
for insert
with check (
  author_id = auth.uid()
  and workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
      and wm.role in ('admin', 'analyst')
  )
);

drop policy if exists brief_update_author_or_admin on public.brief;
create policy brief_update_author_or_admin
on public.brief
for update
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

drop policy if exists brief_delete_author_or_admin on public.brief;
create policy brief_delete_author_or_admin
on public.brief
for delete
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
  and (
    author_id = auth.uid()
    or exists (
      select 1 from public.workspace_member wm
      where wm.workspace_id = brief.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role = 'admin'
    )
  )
);

-- Comments: visible when parent brief is readable; insert by members who can read brief
drop policy if exists brief_comment_select on public.brief_comment;
create policy brief_comment_select
on public.brief_comment
for select
using (
  exists (
    select 1 from public.brief b
    where b.id = brief_comment.brief_id
      and b.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
      and (
        b.status = 'published'
        or b.author_id = auth.uid()
        or exists (
          select 1 from public.workspace_member wm
          where wm.workspace_id = b.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.role = 'admin'
        )
      )
  )
);

drop policy if exists brief_comment_insert on public.brief_comment;
create policy brief_comment_insert
on public.brief_comment
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.brief b
    where b.id = brief_comment.brief_id
      and b.workspace_id in (
        select wm.workspace_id from public.workspace_member wm
        where wm.user_id = auth.uid() and wm.status = 'active'
      )
      and (
        b.status = 'published'
        or b.author_id = auth.uid()
        or exists (
          select 1 from public.workspace_member wm
          where wm.workspace_id = b.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.role = 'admin'
        )
      )
  )
);
