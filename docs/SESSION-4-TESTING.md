# Session 4 — manual test checklist

Prereqs before running through this:

- Migrations 001, 002, 003 applied in Supabase.
- `npx tsx scripts/seed.ts` run (idempotent — safe to re-run to reset today).
- `npm run dev` up at http://localhost:3000.
- OAuth redirect URI `http://localhost:3000/api/auth/google/callback` registered in Google Cloud Console.
- OAuth consent screen includes `https://www.googleapis.com/auth/drive.file` scope.

## 1. Admin connects Drive

- [ ] Visit http://localhost:3000/admin/lock, enter `ADMIN_PIN` (6 digits).
- [ ] On `/admin`, see the amber **Connect Drive** panel.
- [ ] Click **Connect Drive** — redirects to Google.
- [ ] Approve the `drive.file` scope.
- [ ] Redirected back to `/admin?drive_connected=1`.
- [ ] Panel now shows green **Connected to Google Drive** with a Reconnect link.
- [ ] Check Supabase: `select * from drive_tokens;` returns one row with both tokens and a future `expires_at`.

## 2. Kid logs in

- [ ] Visit http://localhost:3000/me/lock, enter `JAIYE_PIN` (4 digits).
- [ ] Land on `/me` with today's tasks.
- [ ] Verify all 4 button variants render:
  - Red-outline **Upload** on photo tasks
  - Amber-outline **Reflect** on reflection tasks
  - No button on check tasks (bigger circle dot)
  - Red-filled **Upload + Reflect** on combined tasks

## 3. Complete a `check` task

- [ ] Click the dot on **Make your bed** (already pre-completed in seed — use **Basketball practice** instead which is open).
- [ ] Dot should fill red with checkmark, task grays out.
- [ ] No navigation away from `/me`.
- [ ] Refresh — still marked done.
- [ ] Supabase: `select * from completions where task_id = '<id>'` returns a row.

## 4. Complete a `photo` task (single photo)

- [ ] Click **Upload** on **Read Big Nate chapter 5 out loud to Kemi**.
- [ ] Lands on `/me/upload/<id>` with the drop zone.
- [ ] Drag in one image (or click to pick).
- [ ] Preview shows with file size.
- [ ] Optional: type a short note in the "Note for Dad" field.
- [ ] Click **Send to Dad**. Button shows spinner.
- [ ] Success screen: red check, "Sent to Dad." headline, streak stat, "Back to Today" button.
- [ ] Click **Back to Today** — task now shows **Done**, crossed out.
- [ ] Check Google Drive: the file appears under `Jaiye School Work / Reading / 2026-MM-DD_read-big-nate-chapter-5-out-loud-to-kemi.jpg`.

## 5. Complete a `reflection` task

- [ ] **Basketball journal** is still open. Click **Reflect**.
- [ ] Lands on `/me/reflect/<id>`. Prompt displayed prominently, big italic textarea.
- [ ] Type 4+ sentences. Encouragement counter updates ("1 sentence. Keep going." → "4 sentences. Nice.").
- [ ] Click **Send to Dad**. Success screen.
- [ ] Back on `/me`, task marked done.
- [ ] Supabase: `select reflection from completions where task_id = '<id>'` shows the text.

## 6. Complete a `photo_and_reflection` task

- [ ] **Watch: How plants drink water** is open. Click **Upload + Reflect**.
- [ ] Same `/me/upload/` route but right-rail now requires reflection.
- [ ] **Send to Dad** stays disabled until both ≥1 photo AND reflection text are present.
- [ ] Fill both, send.
- [ ] Drive has the file; Supabase completion row has `reflection` populated.

## 7. Upload 3 photos to one task

- [ ] Pick any open photo task.
- [ ] Add 3 photos via "+ Add another" (or multi-select in the picker).
- [ ] Preview shows 3-column grid with individual remove buttons.
- [ ] Send.
- [ ] Drive has 3 files named `..._001.jpg`, `..._002.jpg`, `..._003.jpg`.
- [ ] Supabase: `select array_length(photo_drive_ids, 1) from completions where task_id = '<id>'` returns 3.

## 8. Error states (kid-friendly)

- [ ] Empty drop-zone: try uploading a PDF — should show "That's not a picture. Pick a different file."
- [ ] Try a 15MB image — should show "That file's too big. Take a smaller photo."
- [ ] Stop your dev server mid-send, then restart — the in-progress request errors to the preview panel with "Something went wrong. Try again, or ask Dad." No stack traces visible to Jaiye.

## 9. Streak + summary hydration

- [ ] After completing tasks that push today ≥80%, refresh `/me`.
- [ ] Streak counter in top-right reflects real value.
- [ ] Progress ring + "X things left" match actual counts.
- [ ] Subtext: 0 done → "Let's get to it."; some done → "You've already knocked out N. Keep going."; all done → "You did it. Full day."

## 10. Auth boundaries

- [ ] Log out (bottom of `/me`), then try `/me/upload/<some-id>` directly — bounces to `/me/lock`.
- [ ] Without admin session, `/api/auth/google/start` redirects to `/admin/lock`.
- [ ] Tampered `state` on the callback lands on `/admin?drive_error=invalid_state`.

## Known gotchas

- **Drive `thumbnailLink` expires.** We store it as returned from Drive; it's good for ~1 hour. Session 5 admin panel will proxy through the API instead.
- **No live updates** — after completing a task, the kid sees the new state only after `router.refresh()` (which runs automatically in all flows). If a browser tab sits idle, it won't auto-update.
- **Seed pre-completes** 4 tasks (one per completion type). To test the full flow of a specific type, re-run `npx tsx scripts/seed.ts` to wipe today.
