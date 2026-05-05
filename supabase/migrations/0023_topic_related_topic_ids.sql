-- Cross-tag related topics (same workspace); enforced in app layer (no FK to avoid cycles).
alter table public.topic
  add column if not exists related_topic_ids uuid[] not null default '{}';

comment on column public.topic.related_topic_ids is 'Other topic IDs this theme overlaps with (cross-tagging).';
