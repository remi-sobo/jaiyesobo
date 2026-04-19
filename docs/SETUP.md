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

### Reset (drops everything)

```sql
drop table if exists drive_tokens, templates, dad_notes, questions, completions, tasks, users cascade;
```

Then re-run 001, 002, and 003 in order.

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

## Routes

| Route | Purpose |
|---|---|
| `/` | Public homepage |
| `/me` | Jaiye's Today view (requires kid session) |
| `/me/lock` | 4-digit PIN |
| `/me/upload/[taskId]` | Photo upload flow (and photo+reflection combined) |
| `/me/reflect/[taskId]` | Reflection-only flow |
| `/admin` | Admin dashboard (requires admin session) — includes Drive connect |
| `/admin/lock` | 6-digit PIN |
| `POST /api/auth/kid` | Verify kid PIN, set cookie |
| `POST /api/auth/admin` | Verify admin PIN, set cookie |
| `POST /api/auth/logout` | Clear session (accepts `?scope=admin` for admin) |
| `GET /api/auth/google/start` | Admin-only; redirects to Google OAuth |
| `GET /api/auth/google/callback` | OAuth callback; stores tokens |
| `POST /api/check` | Complete a `check`-type task |
| `POST /api/reflect` | Complete a `reflection`-type task |
| `POST /api/upload` | Multipart upload — pushes to Drive, writes completion |
