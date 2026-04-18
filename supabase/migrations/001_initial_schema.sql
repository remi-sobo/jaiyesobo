-- Users: v1 has just Jaiye + a parent admin role
create table users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('kid', 'parent')),
  pin_hash text not null,
  display_name text not null,
  created_at timestamptz default now()
);

-- Tasks: individual things to do on a given day
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  date date not null,
  title text not null,
  description text,
  type text not null check (type in ('homeschool', 'habit', 'chore', 'ball', 'family', 'other')),
  subject text,
  link text,
  requires_photo boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index tasks_user_date_idx on tasks(user_id, date);

-- Completions: when a task is finished, with optional photo
create table completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  completed_at timestamptz default now(),
  note text,
  photo_drive_ids text[] default '{}',
  photo_thumbnails text[] default '{}'
);

create index completions_task_idx on completions(task_id);

-- Questions: the Ask Dad queue
create table questions (
  id uuid primary key default gen_random_uuid(),
  asked_by uuid references users(id) not null,
  body text not null,
  asked_at timestamptz default now(),
  answered_at timestamptz,
  answer text,
  status text not null default 'pending' check (status in ('pending', 'answered'))
);

-- Dad's notes: one per day
create table dad_notes (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Templates: reusable task groups for admin
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  tasks jsonb not null,
  created_at timestamptz default now()
);
