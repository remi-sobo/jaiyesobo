# Session 5 — manual test checklist

Admin dashboard: plan the week, publish/unpublish, brief, notes, uploads, Ask Dad, paste-the-week.

## Prereqs

- Migration 004 applied in Supabase SQL Editor.
- `npx tsx scripts/seed.ts` run at least once (creates Jaiye + Dad).
- `npm run dev` up at http://localhost:3000.
- Admin session at `/admin/lock` with `ADMIN_PIN`.
- (Optional) `ANTHROPIC_API_KEY` in `.env.local` for the paste parser.

## 1. Admin shell

- [ ] http://localhost:3000/admin — redirects to `/admin/plan`.
- [ ] Sidebar shows Jaiye. mark, "Admin" label, nav groups (This week / Longer view / Setup).
- [ ] "Longer view" and "Setup" items render but are disabled with a faint "soon" label.
- [ ] Sidebar footer: green dot + "Signed in as Dad", Log out link.

## 2. Plan page — week navigation

- [ ] Title "Plan the week." with red italic "week.".
- [ ] Week selector arrows navigate prev/next week (URL gets `?w=YYYY-MM-DD`).
- [ ] Status badge: amber "Draft" on first load, green pulsing "Published" after publish.

## 3. Weekly Brief

- [ ] Type a few sentences in the Weekly Brief textarea.
- [ ] Wait ~1s — "Saved · just now" appears.
- [ ] Reload page — text persists.
- [ ] Collapse the Brief section — text preview shows next to the label.

## 4. Add a task (inline)

- [ ] Click "+ Add task" on today's column.
- [ ] Type a title, pick subject + completion type, press Enter.
- [ ] Task appears with a colored left stripe matching subject.
- [ ] Click the task — edit drawer slides in from the right.
- [ ] Change description, save — task title/desc update in the grid.
- [ ] Click Delete (requires confirm) — task disappears.

## 5. Quick-add chips

- [ ] Click "+ Math (30 min)" chip.
- [ ] Verify "Math worksheet" task appears on all 5 weekdays (Mon-Fri).
- [ ] Sort order: new task lands at the bottom of each day's list.

## 6. Publish toggle

- [ ] Click **Publish week**. Confirm. Status badge turns green.
- [ ] Open http://localhost:3000/me in a new tab — tasks are visible.
- [ ] Back on admin, click **Unpublish** → confirm.
- [ ] Refresh `/me` — shows "Dad is still writing your week." banner.

## 7. Duplicate last week

- [ ] Make sure last week has tasks (switch with arrows if needed and add some).
- [ ] On this week, click **Duplicate last week** → confirm.
- [ ] Tasks copy with dates shifted +7 days. Existing tasks for this week are wiped first.
- [ ] Status resets to draft.

## 8. Dad's notes (Today + Tomorrow)

- [ ] Type into Today's note textarea, tab away — "Saved" appears.
- [ ] Type into Tomorrow's note, blur.
- [ ] Log in as kid (http://localhost:3000/me/lock → `JAIYE_PIN`).
- [ ] Today's note renders as the italic "Dad says" card below the task list.

## 9. Ask Dad round-trip

- [ ] As kid, click **Ask Dad** on Today → lands on `/me/ask`.
- [ ] Type a question, send — success screen.
- [ ] Back to admin at `/admin/plan` — question shows in "Ask Dad queue" panel at the bottom right.
- [ ] Type a reply inline → Send reply.
- [ ] Back as kid, refresh `/me` — answered question surfaces as an amber-left card at the top of content. The `seen_at` fires via fetch once rendered.
- [ ] Refresh again — card no longer shows (seen cleared it).

## 10. Uploads panel

- [ ] As kid, complete a photo task (upload ≥1 photo).
- [ ] As admin on `/admin/plan` bottom-right, "Pending uploads" panel shows the entry with a red left stripe.
- [ ] Click "View all" → `/admin/uploads` — gallery view with thumbnails.
- [ ] Click **Mark reviewed** — card de-emphasizes ("Reviewed ✓").

## 11. Drag-to-reorder

- [ ] On a day with ≥2 tasks, grab the `⋮⋮` handle on a task and drag up/down.
- [ ] Release — order persists (a `router.refresh()` pulls the new sort_order from DB).
- [ ] Tab-focus a task, Space to pick up, arrow keys to move, Space again to drop (keyboard a11y).

## 12. Paste the week (AI parser)

**If `ANTHROPIC_API_KEY` is set:**
- [ ] Toggle **Paste the week** in the header.
- [ ] Paste: "Monday: Math page 24, Big Nate chapter 6, make bed. Tuesday: science video about rainbows, write 3 sentences about what you saw."
- [ ] Click **Parse with Claude** — spinner, then a review list grouped by day.
- [ ] Edit (remove) anything off.
- [ ] Click **Add N to week** — tasks appear in the grid.

**If `ANTHROPIC_API_KEY` is NOT set:**
- [ ] Paste parser shows a friendly error: "Paste parser needs ANTHROPIC_API_KEY in .env.local."

## Known limits / deferred

- **Cross-day drag** is not supported (moving a task to a different day still requires the edit drawer).
- **Uploads `/admin/uploads` filtering** (subject / date range) was scoped out for v1 — the page shows last 30 days, unfiltered.
- **Full admin is desktop-first.** Mobile responsiveness for `/admin/plan` was not prioritized — the sidebar shows on narrow screens but the grid stacks to 2 columns.
- **`thumbnailLink`s expire after ~1h.** Dead thumbnails on old uploads are expected; Session 6 will proxy them.
