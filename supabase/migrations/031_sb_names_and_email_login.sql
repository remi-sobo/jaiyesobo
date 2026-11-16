/*
  Migration 031: real names and email login for Run It Back Picks.

  sb_players gets optional first_name and last_name. Only players who said
  they're 13 or older can have them (the check below), and only Remi (admin)
  and Jaiye (his own login) ever see them. The nickname (display_name) stays
  the only public name.

  sb_login_codes holds one row per "email me a login code" request. A row has
  a 6 digit code and a one time link token, both stored only as hashes. It
  lasts 15 minutes, locks after 5 wrong codes, and works once. Rows are only
  made for an address that belongs to a 13+ player who confirmed it, so the
  table never holds an email we didn't already have.

  sb_email_log.kind gains 'login'. Login emails are logged without a
  subscriber dedupe key so a player can ask for a fresh code.

  Server only, like the other sb_ tables: RLS on, no policies.
*/

alter table sb_players add column if not exists first_name text;
alter table sb_players add column if not exists last_name text;

alter table sb_players drop constraint if exists sb_players_real_name_13_plus;
alter table sb_players add constraint sb_players_real_name_13_plus
  check ((first_name is null and last_name is null) or age_band = '13_plus');

alter table sb_players drop constraint if exists sb_players_real_name_length;
alter table sb_players add constraint sb_players_real_name_length
  check (coalesce(char_length(first_name), 0) <= 30 and coalesce(char_length(last_name), 0) <= 30);

create table if not exists sb_login_codes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references sb_players(id) on delete cascade,
  email text not null check (email = lower(email)),
  code_hash text not null,
  link_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sb_login_codes_email_idx on sb_login_codes (email, created_at desc);
create unique index if not exists sb_login_codes_link_key on sb_login_codes (link_hash);

alter table sb_login_codes enable row level security;

alter table sb_email_log drop constraint if exists sb_email_log_kind_check;
alter table sb_email_log add constraint sb_email_log_kind_check
  check (kind in ('confirm', 'consent', 'results', 'newsletter', 'login'));
