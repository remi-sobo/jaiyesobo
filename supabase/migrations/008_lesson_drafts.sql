create table lesson_drafts (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id),
  field_path text not null,
  value text not null default '',
  updated_at timestamptz default now(),
  primary key (task_id, field_path)
);

create index lesson_drafts_user_task_idx on lesson_drafts(user_id, task_id);
