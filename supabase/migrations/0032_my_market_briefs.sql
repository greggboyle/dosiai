-- My Market Briefs: brief classification, per-user subscriptions & read state, in-app notifications.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'brief_kind') then
    create type brief_kind as enum (
      'manual',
      'sweep_summary',
      'daily_summary',
      'weekly_intelligence',
      'regulatory_summary',
      'competitor'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'user_notification_type') then
    create type user_notification_type as enum ('brief_ready');
  end if;
end $$;

alter table public.brief
  add column if not exists brief_kind brief_kind not null default 'manual';

update public.brief set brief_kind = 'manual' where brief_kind is null;

create table if not exists public.workspace_member_brief_subscription (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  brief_kind brief_kind not null,
  subscribed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id, brief_kind)
);

create index if not exists idx_member_brief_sub_workspace on public.workspace_member_brief_subscription(workspace_id);

create table if not exists public.brief_user_read (
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid not null references public.brief(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, brief_id)
);

create index if not exists idx_brief_user_read_user on public.brief_user_read(user_id);

create table if not exists public.user_notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  type user_notification_type not null default 'brief_ready',
  title text not null,
  body text,
  brief_id uuid references public.brief(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists user_notification_user_brief_unique
  on public.user_notification(user_id, brief_id)
  where brief_id is not null;

create index if not exists idx_user_notification_user_created
  on public.user_notification(user_id, created_at desc);

create index if not exists idx_user_notification_user_unread
  on public.user_notification(user_id)
  where read_at is null;

-- Seed subscriptions for existing active members (sweep_summary off by default).
insert into public.workspace_member_brief_subscription (user_id, workspace_id, brief_kind, subscribed)
select wm.user_id, wm.workspace_id, v.kind,
  case when v.kind = 'sweep_summary'::brief_kind then false else true end
from public.workspace_member wm
cross join (
  select unnest(array[
    'manual'::brief_kind,
    'sweep_summary'::brief_kind,
    'daily_summary'::brief_kind,
    'weekly_intelligence'::brief_kind,
    'regulatory_summary'::brief_kind,
    'competitor'::brief_kind
  ]) as kind
) v
where wm.status = 'active'
on conflict (user_id, workspace_id, brief_kind) do nothing;

create or replace function public.seed_workspace_member_brief_subscriptions()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' then
    insert into public.workspace_member_brief_subscription (user_id, workspace_id, brief_kind, subscribed)
    values
      (new.user_id, new.workspace_id, 'manual', true),
      (new.user_id, new.workspace_id, 'sweep_summary', false),
      (new.user_id, new.workspace_id, 'daily_summary', true),
      (new.user_id, new.workspace_id, 'weekly_intelligence', true),
      (new.user_id, new.workspace_id, 'regulatory_summary', true),
      (new.user_id, new.workspace_id, 'competitor', true)
    on conflict (user_id, workspace_id, brief_kind) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seed_brief_subscriptions on public.workspace_member;
create trigger trg_seed_brief_subscriptions
after insert or update of status on public.workspace_member
for each row
execute function public.seed_workspace_member_brief_subscriptions();

alter table public.workspace_member_brief_subscription enable row level security;
alter table public.brief_user_read enable row level security;
alter table public.user_notification enable row level security;

drop policy if exists workspace_member_brief_subscription_select on public.workspace_member_brief_subscription;
create policy workspace_member_brief_subscription_select
on public.workspace_member_brief_subscription
for select
using (
  user_id = auth.uid()
  and workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists workspace_member_brief_subscription_insert on public.workspace_member_brief_subscription;
create policy workspace_member_brief_subscription_insert
on public.workspace_member_brief_subscription
for insert
with check (
  user_id = auth.uid()
  and workspace_id in (
    select wm.workspace_id from public.workspace_member wm
    where wm.user_id = auth.uid() and wm.status = 'active'
  )
);

drop policy if exists workspace_member_brief_subscription_update on public.workspace_member_brief_subscription;
create policy workspace_member_brief_subscription_update
on public.workspace_member_brief_subscription
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists brief_user_read_select on public.brief_user_read;
create policy brief_user_read_select
on public.brief_user_read
for select
using (user_id = auth.uid());

drop policy if exists brief_user_read_insert on public.brief_user_read;
create policy brief_user_read_insert
on public.brief_user_read
for insert
with check (user_id = auth.uid());

drop policy if exists brief_user_read_update on public.brief_user_read;
create policy brief_user_read_update
on public.brief_user_read
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_notification_select on public.user_notification;
create policy user_notification_select
on public.user_notification
for select
using (user_id = auth.uid());

drop policy if exists user_notification_update on public.user_notification;
create policy user_notification_update
on public.user_notification
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
