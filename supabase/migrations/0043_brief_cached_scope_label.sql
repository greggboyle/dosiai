alter table public.brief
  add column if not exists cached_scope_label text;
