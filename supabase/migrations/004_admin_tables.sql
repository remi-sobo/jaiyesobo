-- Weekly Brief: Dad's Sunday thinking doc, one per week
create table weekly_briefs (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  body_markdown text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Published state per week
create table week_status (
  week_start_date date primary key,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz default now()
);

-- Ensure tasks.sort_order exists (was defined in 001; safety check)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'sort_order'
  ) then
    alter table tasks add column sort_order int default 0;
  end if;
end $$;

-- Fast daily task lookups
create index if not exists tasks_date_order_idx on tasks(date, sort_order);

-- Questions: track when kid has seen the reply
alter table questions add column if not exists seen_at timestamptz;

-- Completions: track when Dad has reviewed an upload
alter table completions add column if not exists reviewed_at timestamptz;
