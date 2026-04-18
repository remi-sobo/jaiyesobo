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

### Reset (drops everything)

```sql
drop table if exists templates, dad_notes, questions, completions, tasks, users cascade;
```

Then re-run 001 and 002 in order.

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

- Kid login: [http://localhost:3001/me/lock](http://localhost:3001/me/lock) — enter `JAIYE_PIN` (4 digits).
  On success → `/me` with today's tasks.
- Admin login: [http://localhost:3001/admin/lock](http://localhost:3001/admin/lock) — enter `ADMIN_PIN` (6 digits).
  On success → `/admin` placeholder (real dashboard ships next session).

Sessions are httpOnly signed cookies (`jaiye_session`, `admin_session`), 7 days. Sign out via the "Log out" link at the bottom of `/me`.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/me` says "No Jaiye yet" | Seed not run | `npx tsx scripts/seed.ts` |
| Lock screen bounces back to lock on correct PIN | `SESSION_SECRET` not set | Check `.env.local`, restart `npm run dev` |
| Seed errors `duplicate key` | Already seeded | See reset SQL in step 2 |
| Build fails on `@supabase/ssr` | Dep missing | `npm install` |

## Routes added this session

| Route | Purpose |
|---|---|
| `/me` | Jaiye's Today view (requires kid session) |
| `/me/lock` | 4-digit PIN |
| `/admin` | Admin placeholder (requires admin session) |
| `/admin/lock` | 6-digit PIN |
| `POST /api/auth/kid` | Verify kid PIN, set cookie |
| `POST /api/auth/admin` | Verify admin PIN, set cookie |
| `POST /api/auth/logout` | Clear session (accepts `?scope=admin` for admin) |

The public homepage still lives at `/` and is unchanged.
