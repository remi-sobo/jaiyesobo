-- Track PIN attempts for rate limiting
create table pin_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- e.g. "kid:ip:1.2.3.4" / "admin:ip:1.2.3.4"
  attempted_at timestamptz default now(),
  successful boolean default false
);

create index pin_attempts_identifier_idx on pin_attempts(identifier, attempted_at);

-- Simple key/value config (streak rules, future toggles)
create table app_config (
  key text primary key,
  value jsonb not null
);

insert into app_config (key, value) values
  ('streak_rules', '{"weekdays_only": true, "completion_threshold": 0.8}'::jsonb)
on conflict (key) do nothing;
