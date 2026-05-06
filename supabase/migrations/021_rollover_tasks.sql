-- Rollover assignments: tasks that auto-bump their `date` to today when the
-- kid logs in past their original date without finishing them. Use for
-- "this is for any day this week" style work — like a single grammar lesson
-- that should keep showing up until Jaiye gets to it.
--
-- A task is rolled over when:
--   1. rollover = true
--   2. date < today
--   3. no active completion exists (or completion was undone via deleted_at)
--
-- The bump is performed lazily in lib/rollover.ts the first time the kid's
-- home page is loaded each day. Idempotent — calling twice is a no-op.
alter table tasks
  add column if not exists rollover boolean not null default false;

create index if not exists tasks_rollover_pending_idx
  on tasks (user_id, rollover, date)
  where rollover = true;
