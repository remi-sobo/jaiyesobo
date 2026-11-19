-- Instagram reply picker (docs/INSTAGRAM-REPLIES-SPEC.md).
-- Only the service role touches these tables; RLS is on with no policies.

create table ig_token (
  id int primary key default 1,
  access_token text not null,
  ig_user_id text not null,
  username text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint ig_token_single_row check (id = 1)
);

-- One batch per Pacific morning. The picker link in that morning's email is
-- signed for the batch id, and only opens that batch's comments.
create table ig_batches (
  id uuid primary key default gen_random_uuid(),
  pacific_date date not null unique,
  comment_count int not null default 0,
  emailed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table ig_comments (
  id text primary key,                  -- Instagram comment id
  media_id text not null,
  media_permalink text,
  media_thumb text,
  media_caption text,
  username text not null,
  text text not null,
  commented_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'flagged', 'posting', 'posted', 'skipped', 'hidden', 'left')),
  flag_reason text,
  options jsonb not null default '[]'::jsonb,
  chosen_index int,
  custom_text text,
  posted_text text,
  reply_id text,
  error text,
  decided_by text,                      -- 'kendra' (email link) or 'admin'
  decided_at timestamptz,
  batch_id uuid references ig_batches(id),
  created_at timestamptz not null default now()
);

create index ig_comments_status_idx on ig_comments (status, commented_at desc);
create index ig_comments_batch_idx on ig_comments (batch_id);
create index ig_comments_decided_idx on ig_comments (decided_at desc) where status = 'posted';

alter table ig_token enable row level security;
alter table ig_batches enable row level security;
alter table ig_comments enable row level security;
