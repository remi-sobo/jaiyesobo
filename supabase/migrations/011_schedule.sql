-- Schedule view: tasks get a time slot + duration. Anchors are info-only
-- calendar blocks (PE, Lunch, Pod, Power Hour) the kid sees but doesn't
-- check off. They DO NOT contribute to completion %.

alter table tasks add column if not exists scheduled_time time;
alter table tasks add column if not exists estimated_minutes int;

create index if not exists tasks_date_scheduled_time_idx
  on tasks(date, scheduled_time);

create table if not exists time_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  date date,
  start_time time not null,
  end_time time not null,
  title text not null,
  subtitle text,
  emoji text default '🔒',
  recurring_pattern text,
  constraint anchor_date_or_recurring check (
    (date is not null and recurring_pattern is null) or
    (date is null and recurring_pattern is not null)
  ),
  created_at timestamptz default now()
);

create index if not exists time_anchors_user_idx on time_anchors(user_id);
create index if not exists time_anchors_date_idx on time_anchors(user_id, date) where date is not null;
create index if not exists time_anchors_recurring_idx on time_anchors(user_id, recurring_pattern) where recurring_pattern is not null;

create table if not exists wpm_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  date date not null,
  wpm int not null,
  accuracy_percent int,
  source text default 'typing.com',
  completion_id uuid references completions(id),
  created_at timestamptz default now()
);

create index if not exists wpm_log_user_date_idx on wpm_log(user_id, date);
