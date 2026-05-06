-- Photos can now live in Supabase Storage as a fallback (or primary) when
-- Google Drive is offline / not connected. Parallel array indexed alongside
-- photo_drive_ids and photo_thumbnails. Empty string for entries that live in
-- Drive instead of Supabase.
alter table completions
  add column if not exists photo_storage_paths text[] default '{}';
