-- Migration 016: Phase 3 — multi-kid support (Jaiye + Kemi).
--
-- Why this exists:
--   Almost every kid-scoped table (tasks, completions via tasks, time_anchors,
--   wpm_log, questions, feedback, lesson_drafts) already has a user_id column
--   from earlier migrations. Only `dad_notes` is still global — it has a
--   `unique(date)` constraint that would prevent both kids from having a note
--   on the same day. This migration fixes that.
--
-- Kemi the user is created by `npx tsx scripts/seed-kemi.ts` (not in SQL,
-- because pin_hash needs bcrypt). Run that script after applying this migration.

-- 1. dad_notes: add user_id, backfill existing rows to the only existing kid
--    (Jaiye), then make it NOT NULL and re-key uniqueness on (date, user_id).

alter table dad_notes
  add column if not exists user_id uuid references users(id);

update dad_notes
set user_id = (
  select id from users
  where role = 'kid'
  order by created_at asc
  limit 1
)
where user_id is null;

alter table dad_notes alter column user_id set not null;

-- The original `date date not null unique` produced an implicit unique
-- constraint named `dad_notes_date_key`. Drop it (no-op if already gone)
-- and replace with a composite unique index on (date, user_id).
alter table dad_notes drop constraint if exists dad_notes_date_key;
create unique index if not exists dad_notes_date_user_idx on dad_notes(date, user_id);

-- 2. Helpful index for per-kid scheduled-time queries (used by the kid /me
--    schedule view; harmless if it already exists from earlier work).
create index if not exists tasks_user_date_scheduled_time_idx
  on tasks(user_id, date, scheduled_time);

-- Per-kid app_config (e.g. different streak thresholds per kid) is intentionally
-- NOT introduced here — Phase 3 v1 ships with shared streak rules. Add when needed.
