/*
  Migration 030: email for Run It Back Picks and the newsletter.

  sb_subscribers holds one row per email address (stored lowercased). A row is
  `pending` until the address is confirmed: by the person ('self') or by a
  parent when the player is under 13 ('parent'). Results emails go out every
  Monday when a week publishes; the newsletter goes out when there is a new
  episode or column. `phone` and `want_sms` are reserved for a later text
  message option and nothing reads them yet.

  sb_email_log records every send attempt. The unique (subscriber_id,
  dedupe_key) index is what makes a rerun of the Monday job a no-op.

  Both tables are server-only: RLS on, no policies, so only the service key
  (the site's API routes and cron jobs) can read or write them.
*/

create table if not exists sb_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  player_id uuid references sb_players(id) on delete set null,
  relation text not null check (relation in ('self', 'parent')),
  want_results boolean not null default true,
  want_newsletter boolean not null default true,
  phone text,
  want_sms boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  source text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sb_subscribers_email_lower check (email = lower(email))
);

create unique index if not exists sb_subscribers_email_key on sb_subscribers (email);
create index if not exists sb_subscribers_player_idx on sb_subscribers (player_id);
create index if not exists sb_subscribers_status_idx on sb_subscribers (status);

create table if not exists sb_email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('confirm', 'consent', 'results', 'newsletter')),
  subscriber_id uuid references sb_subscribers(id) on delete cascade,
  dedupe_key text,
  subject text,
  provider_id text,
  status text not null check (status in ('sent', 'skipped', 'error')),
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists sb_email_log_dedupe_key
  on sb_email_log (subscriber_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists sb_email_log_subscriber_idx on sb_email_log (subscriber_id);

create or replace function sb_subscribers_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sb_subscribers_touch on sb_subscribers;
create trigger sb_subscribers_touch before update on sb_subscribers
  for each row execute function sb_subscribers_touch();

alter table sb_subscribers enable row level security;
alter table sb_email_log enable row level security;
