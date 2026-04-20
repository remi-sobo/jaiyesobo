# Session 6 — manual test checklist

Week view (past / current / upcoming), My Photos archive, PIN rate limiting, production polish.

## Prereqs

- Migration 005 applied in Supabase.
- `npm run dev` up (from a terminal with `ANTHROPIC_API_KEY` unset — see troubleshooting in SETUP.md).
- Kid session (`/me/lock` → `JAIYE_PIN`).
- For past-week tests, at least one week prior should have tasks — use admin to seed if needed.

## 1. Today view — streak

- [ ] `/me` shows "Day streak ★ N" in top right.
- [ ] Complete a full day of tasks (≥80%) — streak ticks after refresh.
- [ ] If current streak >7 and best ≥ current, "Best: X" appears faintly below.
- [ ] Weekends don't extend or break the streak (skipped).

## 2. Week view — current

- [ ] `/me/week` lands on this week.
- [ ] Hero shows "You've crushed N" with ring on right.
- [ ] Past days this week are faded, today has red top border, future days muted.
- [ ] Keyboard: `←` → prev week, `→` → next week, `T` → today.

## 3. Week view — past

- [ ] Click **‹ Prev** → last week loads.
- [ ] Hero shows "You crushed X this week." with perfect-days count.
- [ ] Days that hit 100% get a red top border (🔥 badge in subject breakdown).
- [ ] Click a completed task pill → receipt expands below the grid with photos / reflection / timestamp.
- [ ] Click another pill → receipt swaps to that task.
- [ ] Click the × on the receipt → collapses.
- [ ] Subject breakdown shows badges: "🔥 Perfect" / "Great" / "Solid" / nothing.

## 4. Week view — upcoming (unpublished)

- [ ] From current week, click **Next ›** (if next week isn't published yet).
- [ ] Hero shows "Next week is loading." with amber accent.
- [ ] Grid shows day cards faded with no tasks.
- [ ] "← Back to this week" button returns.

## 5. Week view — upcoming (published)

- [ ] As admin, publish a future week.
- [ ] As kid, navigate to that week.
- [ ] Hero shows "N things waiting for you."
- [ ] Grid shows tasks in future-muted styling.
- [ ] Subject breakdown is a horizontal stacked bar with counts per subject.

## 6. My Photos

- [ ] `/me/photos` shows grid grouped by month, newest first.
- [ ] Hover a photo card — subject + task title fade in over bottom gradient.
- [ ] Filter buttons at top: All / Math / Reading / Writing / Science / Ball — clicking filters.
- [ ] Click a photo → lightbox opens with full view.
- [ ] `←` / `→` navigate within filtered set, `Esc` or × closes.
- [ ] Empty state shows "Your photo wall starts soon." if no photos.
- [ ] Thumbnails older than ~1 hour may 404 (Drive limit, noted).

## 7. Ask Dad loop (verify)

- [ ] Kid: `/me/ask` → submit a question → success screen.
- [ ] Admin: `/admin/plan` bottom-right panel shows the question.
- [ ] Admin: type reply → Send.
- [ ] Kid: refresh `/me` → answered question surfaces as amber "Dad answered your question" card.
- [ ] Refresh again → card is gone (seen_at set).

## 8. PIN rate limiting

- [ ] Type a wrong 4-digit PIN at `/me/lock`.
- [ ] After 3 failures, subtle "2 tries left." hint appears below the dots.
- [ ] After 5 failures, buttons dim + "Locked out. Try again at [time]." shows.
- [ ] Supabase `pin_attempts` table logs each attempt with `successful=false`.
- [ ] Correct PIN after lockout is rejected until the 15-min window passes.
- [ ] Correct PIN when not locked clears prior failures (check table — all `successful=false` rows deleted for that identifier).
- [ ] Same behavior at `/admin/lock` with 6-digit PIN.

## 9. Deep linking after auth

- [ ] Log out of kid session (`/me` → Log out at bottom).
- [ ] Paste `http://localhost:3000/me/week?w=2026-04-13` into browser.
- [ ] Redirects to `/me/lock?next=%2Fme%2Fweek%3Fw%3D2026-04-13`.
- [ ] Enter PIN → lands on `/me/week?w=2026-04-13` (NOT `/me`).
- [ ] Same for `/me/photos` and any deep-linked `/admin/plan?w=...`.

## 10. Production polish

- [ ] Page titles in the browser tab:
  - `/me` → "Jaiye — Today"
  - `/me/week` → "Jaiye · This Week"
  - `/me/photos` → "Jaiye · Photos"
  - `/me/lock` → "Jaiye · Lock"
  - `/admin/lock` → "Admin · Lock"
- [ ] View-source on any `/me` or `/admin` page → `<meta name="robots" content="noindex, nofollow, nocache">`.
- [ ] Public `/` unchanged — no noindex (homepage should index).

## 11. Deep-state sanity

- [ ] Hit `/me/week` in a new incognito → bounces to lock → after auth → lands on week view.
- [ ] `/me` with expired cookie → bounces to lock.
- [ ] Admin session bleed-through: logging out of admin shouldn't affect kid session, and vice versa.
