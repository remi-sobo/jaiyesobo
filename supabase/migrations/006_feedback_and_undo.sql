-- Feedback: bugs, ideas, "not sure" from Jaiye; replies from Dad surface
-- on Today via the same pattern as answered questions.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references users(id) not null,
  body text not null,
  kind text check (kind in ('bug', 'idea', 'unsure')),
  page_url text,
  user_agent text,
  submitted_at timestamptz default now(),
  status text not null default 'new' check (status in ('new', 'in_progress', 'fixed', 'closed')),
  dad_reply text,
  dad_replied_at timestamptz,
  seen_by_kid_at timestamptz,
  archived_at timestamptz
);

create index feedback_status_submitted_idx on feedback(status, submitted_at desc);
create index feedback_unseen_idx on feedback(submitted_by) where seen_by_kid_at is null and dad_reply is not null;

-- Soft-delete for completions: undo inside 10-min grace doesn't lose photos/reflection.
alter table completions add column if not exists deleted_at timestamptz;
create index if not exists completions_task_active_idx on completions(task_id) where deleted_at is null;
