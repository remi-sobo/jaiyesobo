# /me setup

One-time steps to bring up Jaiye's private OS locally after cloning.

## 1. Environment

`.env.local` must exist at the project root with all of:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_DRIVE_FOLDER_ID
JAIYE_PIN           # 4 digits
ADMIN_PIN           # 6 digits
SESSION_SECRET      # 32-byte hex (openssl rand -hex 32)
ANTHROPIC_API_KEY   # optional — only needed for the paste-the-week parser on /admin/plan
```

`.env.local` is gitignored — never commit it.

## 2. Run the Supabase migrations

Apply migrations **in order** via the Supabase SQL Editor.

### 001 — initial schema

1. Dashboard → **SQL Editor** → **New query**.
2. Paste `supabase/migrations/001_initial_schema.sql`.
3. **Run**.

Six tables created: `users`, `tasks`, `completions`, `questions`, `dad_notes`, `templates`.

### 002 — completion types

New query → paste `supabase/migrations/002_completion_types.sql` → Run.

Adds `tasks.completion_type` (check constraint: `photo` / `reflection` / `check` / `photo_and_reflection`), `tasks.reflection_prompt`, and `completions.reflection`.

### 003 — Drive tokens

New query → paste `supabase/migrations/003_drive_tokens.sql` → Run.

Creates a single-row `drive_tokens` table to store Dad's Google OAuth `access_token`/`refresh_token`/`expires_at`. `constraint single_row check (id = 1)` prevents accidental second rows.

### 004 — admin tables

New query → paste `supabase/migrations/004_admin_tables.sql` → Run.

Adds:
- `weekly_briefs` — one row per week (Dad's Sunday thinking).
- `week_status` — `draft` / `published` per week. Kid's Today page hides tasks until the week is published.
- `tasks_date_order_idx` on `tasks(date, sort_order)` for fast week queries.
- `questions.seen_at` — track when kid has read Dad's reply.
- `completions.reviewed_at` — track when Dad has reviewed an upload.

### Reset (drops everything)

```sql
drop table if exists drive_tokens, weekly_briefs, week_status, templates, dad_notes, questions, completions, tasks, users cascade;
```

Then re-run 001 → 002 → 003 → 004 in order.

## 3. Seed

Insert Jaiye, Dad, today's tasks, and today's Dad's note:

```bash
npx tsx scripts/seed.ts
```

**Idempotent.** Finds existing Jaiye/Dad rows if present; wipes today's tasks + dad_note before re-inserting. Safe to run repeatedly. Tasks include all four completion types (photo / reflection / check / photo_and_reflection) so you can see each button variant.

## 4. Test auth

```bash
npm run dev
```

- Kid login: [http://localhost:3000/me/lock](http://localhost:3000/me/lock) — enter `JAIYE_PIN` (4 digits).
  On success → `/me` with today's tasks.
- Admin login: [http://localhost:3000/admin/lock](http://localhost:3000/admin/lock) — enter `ADMIN_PIN` (6 digits).
  On success → `/admin`.

## 5. Connect Google Drive (admin, one-time)

The upload flow pushes Jaiye's photos into Dad's Drive. You need to authorize once.

### Register the redirect URI in Google Cloud Console

Google will reject the callback unless the URI is whitelisted:

1. [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click the OAuth 2.0 Client ID you're using for this project.
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google/callback` (dev)
   - `https://jaiyesobo.com/api/auth/google/callback` (prod, when you deploy)
4. Save.

### Scope

The app requests `https://www.googleapis.com/auth/drive.file`. This scope only lets the app see/create files **it creates** — it cannot read your wider Drive. If you haven't already, add it to the OAuth consent screen's scope list.

### Authorize

1. Sign in at [http://localhost:3000/admin/lock](http://localhost:3000/admin/lock) with `ADMIN_PIN`.
2. On `/admin`, click **Connect Drive**.
3. Approve in Google. You'll be redirected back with a green "Connected to Google Drive" banner.

The access/refresh tokens land in the `drive_tokens` table. Refresh happens automatically when the access token expires (googleapis handles this; we persist new access tokens on the `tokens` event).

To re-authorize (new Google account or additional scopes): click **Reconnect** in the same panel.

Sessions are httpOnly signed cookies (`jaiye_session`, `admin_session`), 7 days. Sign out via the "Log out" link at the bottom of `/me`.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/me` says "No Jaiye yet" | Seed not run | `npx tsx scripts/seed.ts` |
| Lock screen bounces back to lock on correct PIN | `SESSION_SECRET` not set | Check `.env.local`, restart `npm run dev` |
| Seed errors `duplicate key` | Already seeded | See reset SQL in step 2, seed is now idempotent so re-running works |
| Build fails on `@supabase/ssr` | Dep missing | `npm install` |
| Drive callback returns `redirect_uri_mismatch` | Redirect URI not registered | Add `http://localhost:3000/api/auth/google/callback` in Google Cloud Console |
| Drive upload fails with `Drive not connected` | drive_tokens empty | Admin → `/admin` → Connect Drive |
| Callback `drive_error=exchange_failed` | OAuth consent incomplete or scope missing | Check OAuth consent screen includes `drive.file` scope, client secret matches |
| Paste-the-week always returns "missing_key" even though `.env.local` has the key | Claude Desktop exports `ANTHROPIC_API_KEY=""` (empty) to every subprocess; shell env wins over `.env.local` | Start dev server from a Terminal outside Claude Desktop, OR prefix with `unset ANTHROPIC_API_KEY && ` — verify with `env \| grep ANTHROPIC` first |

## Publishing note

Tasks added in `/admin/plan` stay invisible to Jaiye until Dad clicks **Publish week**. Unpublished weeks show "Dad is still writing your week." on `/me`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Public homepage |
| `/me` | Jaiye's Today view (kid session; tasks gated by publish status) |
| `/me/lock` | 4-digit PIN |
| `/me/ask` | Submit a question to Dad |
| `/me/upload/[taskId]` | Photo upload flow |
| `/me/reflect/[taskId]` | Reflection-only flow |
| `/admin` | Redirects to `/admin/plan` |
| `/admin/lock` | 6-digit PIN |
| `/admin/plan` | Week planner — grid, weekly brief, Dad's notes, quick-add, paste-the-week, uploads + ask-dad panels |
| `/admin/uploads` | Full pending-uploads gallery |
| `/admin/ask-dad` | Full Ask Dad queue |
| `POST /api/admin/tasks` | Create task |
| `PATCH/DELETE /api/admin/tasks/[id]` | Update / delete |
| `POST /api/admin/tasks/reorder` | Persist drag-reorder |
| `POST /api/admin/tasks/bulk` | Bulk insert (used by paste-the-week) |
| `POST /api/admin/week-status` | Toggle draft ↔ published |
| `POST /api/admin/weekly-brief` | Upsert the Sunday brief |
| `POST /api/admin/dad-note` | Upsert a day's Dad's note |
| `POST /api/admin/duplicate-week` | Copy prev week's tasks into this week |
| `POST /api/admin/questions/[id]/reply` | Reply to a kid question |
| `POST /api/admin/uploads/[id]/review` | Mark completion as reviewed |
| `POST /api/parse-week` | AI-parse a free-form week plan via Claude |
| `POST /api/questions` | Kid submits a question |
| `POST /api/questions/[id]/seen` | Kid marks Dad's reply as seen |
| `POST /api/auth/google/start` / `callback` | Drive OAuth |
| `POST /api/upload` / `/api/reflect` / `/api/check` | Kid completion endpoints |
