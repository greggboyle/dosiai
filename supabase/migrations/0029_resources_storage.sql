-- Phase 4: resources library storage bucket
--
-- The application currently performs upload/list/sign URL operations
-- through the service-role client. This migration pre-creates the
-- bucket so infrastructure is explicit and deterministic across envs.

insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', false, 52428800) -- 50 MB
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
