# Site analytics spec

Status: built on branch `admin/analytics`. Not live until migration 033 is run and the branch ships.

## Goal

Dad opens `/admin/analytics` and sees, in one page, what people do on jaiyesobo.com: which pages they visit, what they click, what they read, what they watch, what they play, and who keeps coming back.

## Decisions

1. **First party, in our own Supabase.** One table, `site_events`. No Google Analytics, no third party script, nothing leaves our database. This keeps the Run It Back privacy promise ("no ads and no ad tracking, we don't sell or share") true.
2. **"Who" means a browser, plus a name only for Run It Back players 13 and up.** Every browser gets a random id kept in its own storage. If that browser is signed in as a Run It Back player who said they are 13 or older, the dashboard shows their nickname. Everyone else, including players under 13 and people in the games (which never ask age), is "Visitor 3F2A". We never ask for anything new.
3. **We do not store** IP addresses, location, browser fingerprints, user agent strings, or query strings.
4. **Browsers that send Do Not Track or Global Privacy Control** are still counted, but with an id that lasts only for that tab and is never linked to a name.
5. **Dad is not counted.** A browser signed in to `/admin` records nothing. Jaiye's and Kemi's signed in browsers are recorded but marked as family and hidden by default, with a switch to show them.
6. **Private areas are never tracked:** `/admin`, `/me`, `/games-admin`, `/api`.
7. **Secret bits of URLs are masked** before they are stored: league invite codes (`/runitback/l/:code`) and game share tokens (`/games/share/:token`).

## What gets recorded

| Event | When | What is kept |
|---|---|---|
| `pageview` | A public page opens, or the route changes | path, where they came from (site name only), phone / tablet / computer |
| `engage` | The tab is hidden or the page changes | seconds the page was actually on screen |
| `click` | Any link is clicked, plus buttons marked `data-track` | where the link goes (no query string), its text, inside or outside the site |
| `read` | A column or episode article is opened, then at 25, 50, 75 and 100 percent scrolled | which piece, how far |
| `watch` | A short or a YouTube episode starts, pauses, or ends | which video, seconds watched, whether it finished |

Game plays are not new events. Every game already writes a row to the `plays` table when a round starts, so the dashboard reads that table. That also means game numbers go back to before this shipped.

## The dashboard (`/admin/analytics`)

- Range switch at the top: Today, 7 days, 30 days, 90 days. Everything below uses the same range. Days are Pacific time.
- Four headline numbers with the change against the period before: visitors, visits, page views, average time on a page.
- A daily chart of visitors and page views, with a table view.
- Top pages: views, visitors, average time.
- Reading: for each column and episode, how many opened it, got halfway, and finished.
- Watching: for each short and episode, plays, finishes, total watch time.
- Playing: for each game, rounds started and how many different players.
- Clicks: the most clicked links and buttons, with outside links marked.
- Where people come from, and phone / tablet / computer split.
- People: every visitor in the range, newest first, with name when known, visits, pages, and what they spent the most time on. Tap one to see their full timeline (`/admin/analytics/visitor/[id]`).
- Live feed: the last 40 things that happened.

## How it works

- `components/analytics/tracker.tsx` sits in the root layout. It sends events in small batches to `POST /api/pulse`, and uses `sendBeacon` when the page is closing so nothing is lost.
- `lib/analytics/client.ts` is the `track()` call the video players use.
- `/api/pulse` checks the request came from our own site, validates and trims every field, drops known bots, drops Dad, works out the name link from cookies that already exist, and inserts.
- `lib/analytics/summarize.ts` turns raw events into every number on the dashboard. It is a pure function with tests.
- `site_events` has row level security on with no policies, like the other server only tables.

## Limits, on purpose

- **Run It Back web app and iPhone app screens are not tracked.** The app at `/runitback/app` is a separate Expo build. Picks and players are already in the `sb_` tables. Adding app screens is a follow up.
- **YouTube watch time depends on YouTube's player messages.** If YouTube changes them, episode plays stop counting but nothing breaks. Shorts are our own video files and always count.
- **The dashboard adds up raw rows in the server**, up to 60,000 events per load. That is plenty for now. If the site outgrows it, the next step is a nightly rollup table.
- **Rows older than 13 months are deleted** when the dashboard loads.
- Ad blockers can block `/api/pulse`. Numbers are a floor, not an exact count.

## To go live

1. Run `supabase/migrations/033_site_analytics.sql` in the Supabase SQL editor.
2. Merge and deploy.
3. The site privacy policy (`components/legal/privacy-body.tsx`) is updated in this branch to say all of the above. Read it before it ships.
