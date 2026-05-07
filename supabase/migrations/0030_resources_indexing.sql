-- Phase 4: resources indexing schema for RAG/context retrieval

do $$
begin
  if not exists (select 1 from pg_type where typname = 'resource_document_status') then
    create type resource_document_status as enum (
      'uploaded',
      'queued',
      'processing',
      'ready',
      'failed',
      'archived'
    );
  end if;
end $$;

create table if not exists public.resource_document (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  storage_bucket text not null default 'resources',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  document_type text,
  status resource_document_status not null default 'uploaded',
  approved_for_ai boolean not null default true,
  extracted_char_count integer not null default 0,
  chunk_count integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, storage_path)
);

create index if not exists idx_resource_document_workspace_status
  on public.resource_document (workspace_id, status, updated_at desc);

create table if not exists public.resource_document_chunk (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  resource_document_id uuid not null references public.resource_document(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (resource_document_id, chunk_index)
);

create index if not exists idx_resource_chunk_document on public.resource_document_chunk(resource_document_id, chunk_index);
create index if not exists idx_resource_chunk_embedding on public.resource_document_chunk
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64)
  where embedding is not null;

alter table public.resource_document enable row level security;
alter table public.resource_document_chunk enable row level security;

drop policy if exists resource_document_select_member on public.resource_document;
create policy resource_document_select_member
on public.resource_document
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists resource_document_insert_analyst on public.resource_document;
create policy resource_document_insert_analyst
on public.resource_document
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists resource_document_update_analyst on public.resource_document;
create policy resource_document_update_analyst
on public.resource_document
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists resource_document_delete_admin on public.resource_document;
create policy resource_document_delete_admin
on public.resource_document
for delete
using (public.user_is_workspace_admin(workspace_id));

drop policy if exists resource_chunk_select_member on public.resource_document_chunk;
create policy resource_chunk_select_member
on public.resource_document_chunk
for select
using (public.user_is_active_member(workspace_id));

drop policy if exists resource_chunk_insert_analyst on public.resource_document_chunk;
create policy resource_chunk_insert_analyst
on public.resource_document_chunk
for insert
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists resource_chunk_update_analyst on public.resource_document_chunk;
create policy resource_chunk_update_analyst
on public.resource_document_chunk
for update
using (public.user_is_analyst_or_admin(workspace_id))
with check (public.user_is_analyst_or_admin(workspace_id));

drop policy if exists resource_chunk_delete_admin on public.resource_document_chunk;
create policy resource_chunk_delete_admin
on public.resource_document_chunk
for delete
using (public.user_is_workspace_admin(workspace_id));
