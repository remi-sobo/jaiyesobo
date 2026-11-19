-- Review fixes for the reply picker.
-- 'unknown': Instagram may or may not have taken a reply (timeout, lost
-- response, crash mid-post). It is never retried on its own; a parent checks.
alter table ig_comments drop constraint ig_comments_status_check;
alter table ig_comments add constraint ig_comments_status_check
  check (status in ('open', 'flagged', 'posting', 'unknown', 'posted', 'skipped', 'hidden', 'left'));
alter table ig_comments add column claimed_at timestamptz;

-- A killed batch can be replaced the same morning: one live batch per date.
alter table ig_batches drop constraint ig_batches_pacific_date_key;
create unique index ig_batches_live_date_idx on ig_batches (pacific_date) where revoked_at is null;
