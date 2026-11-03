/*
  Migration 028: On The Court prep notes.

  Jaiye's answers to the weekly interview prompts, one row per prompt per week.
  The key is positional (like "last.score.1" or "this.pick.0"), so a row keeps
  meaning the same thing even if names or picks change.

  Only adds. RLS is on with no policies: only server routes using the service
  role can read or write it, same as the other sb_ tables.
*/

create table if not exists sb_pod_notes (
  season text not null,
  week_number int not null,
  key text not null,
  answer text not null default '',
  updated_at timestamptz not null default now(),
  primary key (season, week_number, key)
);

alter table sb_pod_notes enable row level security;
