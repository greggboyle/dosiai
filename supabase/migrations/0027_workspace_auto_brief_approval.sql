alter table public.workspace
  add column if not exists auto_briefs_auto_approve boolean not null default true;
