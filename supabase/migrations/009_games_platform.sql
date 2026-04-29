-- /games platform — public NBA games. Separate auth namespace from /me.

create table games (
  slug text primary key,
  title text not null,
  description text not null,
  status text not null default 'live' check (status in ('live', 'beta', 'archived')),
  created_at timestamptz default now()
);

create table game_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  is_adult boolean default false,
  parental_consent_at timestamptz,
  created_at timestamptz default now()
);

create table anon_sessions (
  id uuid primary key default gen_random_uuid(),
  cookie_id text unique not null,
  display_name text default 'Anonymous',
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create table plays (
  id uuid primary key default gen_random_uuid(),
  game_slug text references games(slug) not null,
  user_id uuid references game_users(id),
  anon_session_id uuid references anon_sessions(id),
  payload jsonb not null,
  result jsonb,
  share_token text unique,
  created_at timestamptz default now(),
  constraint user_or_anon check (
    (user_id is not null and anon_session_id is null) or
    (user_id is null and anon_session_id is not null)
  )
);

create index plays_game_user_idx on plays(game_slug, user_id);
create index plays_game_anon_idx on plays(game_slug, anon_session_id);
create index plays_share_token_idx on plays(share_token);

create table game_content (
  id uuid primary key default gen_random_uuid(),
  game_slug text references games(slug) not null,
  content_type text not null,
  payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'archived', 'community_submitted')),
  difficulty int default 3,
  created_by_curator boolean default true,
  created_at timestamptz default now()
);

create index game_content_game_status_idx on game_content(game_slug, status);

create table daily_features (
  date date not null,
  game_slug text references games(slug) not null,
  content_id uuid references game_content(id) not null,
  primary key (date, game_slug)
);

-- Seed three games at launch
insert into games (slug, title, description, status) values
  ('top-five', 'Top 5 [Blank]', 'Pick your top 5 of any NBA category. AI judges your list.', 'live'),
  ('trivia', 'NBA Trivia', '10 questions a day. Build your streak.', 'beta'),
  ('draft', 'NBA All-Time Draft', 'Two players. One team. Draft a starting 5 and let AI judge.', 'beta')
on conflict (slug) do nothing;
