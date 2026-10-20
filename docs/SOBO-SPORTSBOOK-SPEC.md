# Sobo Sportsbook: spec (confirmed)

A season-long NBA pick'em between Jaiye and Remi, open to anyone who wants to try and beat
them. No money, just points and bragging rights.
Every Monday the AI drafts a slate of 10 to 12 picks for the coming week, Remi approves it,
and both players pick on one shared screen in admin. Results are graded automatically from
real box scores, and anyone can follow the battle live on jaiyesobo.com/sportsbook.

## 1. The weekly loop

A week runs Monday 12:00am to Sunday 11:59pm Pacific.

| When | What happens | Who |
|---|---|---|
| Monday early morning (cron) | Pull final box scores for last week, grade every pick, draft the AI recap. Draft next week's slate. | Automatic |
| Monday | Remi reviews last week's results and taps **Finalize week** (points become official). Remi reviews the new slate: approve, swap, edit a line, regenerate one pick, add **Jaiye's Prop**. Taps **Open the week**. | Remi (Jaiye can help) |
| Monday to Sunday | Both make picks on the shared screen. Each pick locks at its game's tip-off. | Jaiye and Remi |
| Every night (cron) | Pull finished games, grade any picks that are decided, update the live scoreboard. | Automatic |
| Sunday night | Last games finish. Week is fully graded by Monday morning's run. | Automatic |

If Monday is missed, nothing breaks: last week waits in "graded, not final" and the new
slate waits in "draft" until Remi gets to it.

## 2. Pick types

The AI picks a mix every week (10 to 12 total) so it never feels the same. Lines always end
in .5 so there are no ties. Each pick has a point value shown on the card.

| Type | Example | Points |
|---|---|---|
| Winner | Lakers or Warriors? | 1 |
| Spread | Thunder win by more than 7.5? | 2 |
| Over/under (game total) | Celtics vs Knicks: over or under 221.5? | 2 |
| Team total | Blazers score over or under 112.5? | 2 |
| Player higher/lower | Wemby: more or less than 11.5 rebounds? | 2 |
| Head to head | Who scores more: Luka or SGA? | 2 |
| Yes/no | Will Jokic get a triple double? | 3 |
| Margin bucket | Bucks win by 1 to 5, 6 to 10, or 11+? (or Pacers win) | 3 |
| Week long | How many wins do the Lakers get this week? 0 to 1, 2, 3+ | 3 |
| Weekly leader | Most points in one game this week: Tatum, Curry, Edwards or Booker? | 3 |
| Closest guess | Total 3s made in Warriors vs Kings. Closest guess wins, exact hit doubles it. | 3 (6 exact) |
| Upset Special (always 1 per week) | Pick an underdog to win outright. | 5 |
| Jaiye's Prop (optional, 1 per week) | Jaiye writes a question and both answers. Remi sets the points (1 to 3). | 1 to 3 |

**Lock of the Week:** each player stars one pick. Right: double points. Wrong: minus the
pick's base value. Lock must be set before that pick's game tips.

**Weekly winner:** most points. Tie goes to whoever's Lock hit; still tied, it's a tie week.

**Season tracking (all season long, everyone):**
- **Jaiye vs Remi record:** the headline. Head to head weeks won, like "Jaiye leads 7-5", plus each
  one's total points for the season. This is the rivalry that decides the family title.
- **Season standings for everyone:** every player (Remi, Jaiye and every challenger) gets
  weeks won and total season points. A "week won" means the most points of anyone that week.
- **Challenger trophy case:** each challenger's row shows their weeks won, total points, and
  how many weeks they beat Remi and how many they beat Jaiye.
- **Extras:** current streak, best single week, Lock of the Week hit rate.
- **End of the regular season:** two titles. The **Family Champion** (Jaiye vs Remi, most weeks
  won, total points breaks a tie) and the **Sobo Sportsbook Champion** (most total points of
  anyone, challengers included).

## 2b. Beat the Sobos (open to anyone)

Friends and family can play the same weekly slate against Jaiye and Remi.

- **Join:** jaiyesobo.com/sportsbook/play. Type a display name (first name or nickname, 20
  characters max). No email, no password, nothing else collected.
- **Coming back:** the browser remembers them for the season. They also get a short player
  code (like `HOOP-7342`) to pick up on another device.
- **Same rules:** same 10 to 12 picks, same points, same Lock of the Week, same tip-off locks.
- **No copying:** on public pages, everyone's picks (Remi's and Jaiye's included) stay hidden
  until that pick locks at tip-off. Then they're revealed for everyone.
- **Leaderboards:** every week shows Remi, Jaiye and all challengers ranked. Jaiye and Remi are
  marked with a badge. Headline stat: "4 of 9 challengers beat Jaiye this week".
- **Season board:** total points and weeks won for everyone who plays. Challengers who
  finish a week ahead of both Jaiye and Remi get a "Beat the Sobos" badge on their row.
- **Safety (it's a kid's site):** display names go through a bad-word filter, Remi can hide
  or rename any name from admin, and joining is rate limited. Names show publicly right
  away unless Remi turns on "approve new names first" in settings.
- **Share:** a "Think you can beat us?" link and Open Graph card for texting to friends.

## 3. How the AI builds a slate (stats based, free)

Inputs the AI gets on Monday:
- Next week's schedule (NBA public schedule feed).
- Season averages and last 5 games for players, computed from box scores we store nightly.
- Team records and recent form, from the same stored games.
- Last week's slate, so it doesn't repeat the same teams and players.
- A short list of "Jaiye's teams and players" from settings so his favorites show up often.

Rules the AI follows:
- 10 to 12 picks, at least 6 different types, exactly one Upset Special.
- Spread the picks across different days so there's something to watch most nights.
- Lines come from stats: player lines near season or last 5 average, spreads from point
  differential and home court, totals from both teams' scoring. Always .5 lines.
- Each pick gets a one line "why this is interesting" note for the card.
- Early season (first 2 to 3 weeks, few games stored), lean on winner, head to head and
  week long picks, and set player lines from what we have plus the AI's knowledge of last season.

Remi can swap any pick, regenerate one, or edit its line or points before opening the week.

## 4. Grading: code, not AI

Scores and stats decide points, so grading is plain code reading final box scores. The AI
never decides who got a pick right.
- Postponed or cancelled game: the pick is void (0 points for both).
- Player doesn't play: that player pick is void.
- Results show on each card: the actual number, who was right, points earned.
- The AI only writes the Monday recap: who won, best call, worst miss, one fun stat, in a
  short kid friendly sports-radio voice. Remi sees it before finalizing.
- **Finalize week** makes points official. After that the week is locked (database enforced,
  same as predictions).

## 5. Screens

### Admin: /admin/sportsbook (shared screen, mobile first)
- **This week:** the slate as cards. Each card has a Remi side and a Jaiye side. Tap to pick.
  Star = Lock of the Week. Lock countdown on each card ("Locks Tue 7:00pm").
- **Blind picking:** on the shared screen, a pick stays covered ("Remi picked ✓") until both
  have picked that card, then both are revealed. Keeps it fair when you pass the phone.
- **Slate editor (Monday):** AI draft, swap, regenerate, edit line or points, add Jaiye's Prop,
  Open the week.
- **Results (Monday):** graded cards, recap preview, Finalize week.
- **Challengers:** list of everyone playing, hide or rename a name, "approve new names first" toggle.
- **Settings:** Jaiye's favorite teams and players, default slate size.

### Public: /sportsbook
- Header: SOBO SPORTSBOOK, week number, live score "JAIYE 17 · REMI 14".
- This week's cards with Remi's and Jaiye's picks (revealed at tip-off), live results as games
  finish (✓ / ✗ / pending), points.
- Big button: **Beat the Sobos**, which goes to /sportsbook/play.
- Weekly leaderboard: Remi, Jaiye and every challenger.
- Jaiye vs Remi season record ("Jaiye leads 7-5") with total points.
- Season standings for everyone: weeks won, total points, weeks beating Remi, weeks beating Jaiye.
- A small week by week chart of Jaiye vs Remi.
- Last week's recap.
- Archive: /sportsbook/2026-27/week-3 for every past week.
- Open Graph image with the current score.

Brand: same dark background, red accent, Fraunces / Inter / JetBrains Mono, team colored
tiles from the predictions feature (no logos).

## 6. Data (new tables, shared Supabase, scoped like everything else)

- `sb_weeks`: season, week number, start and end date, status (draft, open, graded, final),
  recap, final scores, winner.
- `sb_items`: the picks in a week. Type, prompt, options, line, points, game id(s), player id(s),
  locks_at, AI note, result, status (open, locked, won/lost per side, void).
- `sb_players`: Jaiye and Remi (linked to `users`) plus challengers (display name, player code,
  hidden flag, approved flag). Challengers are not site users and can't log in to anything else.
- `sb_picks`: one row per player per item. Choice, is_lock. Database rejects any insert or
  change after locks_at, and anything once the week is final.
- `nba_games` and `nba_player_games`: a local copy of schedule, final scores and box scores,
  filled nightly. Powers stats, grading and the AI inputs.

Public writes (challenger joins and picks) go through server routes with rate limiting and
the same lock rules; the public Supabase keys still can't write anything.

## 7. Automation

- Vercel cron, nightly around 3am Pacific: ingest finished games, grade decided picks.
- Vercel cron, Monday around 5am Pacific: grade last week, write recap, draft next slate.
- Both can also be run by hand from admin ("Refresh results", "Draft slate").
- Data source: NBA's public JSON feeds on cdn.nba.com (schedule, scoreboard, box scores).
  No API key. First build step is confirming they're reachable from Vercel; fallback is a
  free stats API if not.
- AI: Claude via the Anthropic setup the site already uses.

## 8. Not in v1

- Real sportsbook odds (AI lines from stats only).
- Push or email notifications.
- Challenger accounts with email or passwords (display name and player code only).
- Live in-game updates (results update nightly and on demand, not play by play).

## 9. Done means

- Monday flow works end to end: AI slate, edit, open, both pick on one phone, blind until both pick.
- Picks lock at tip-off, enforced in the database.
- Nightly grading from real box scores, voids handled.
- Recap written, Finalize week locks it.
- Public /sportsbook live with this week, standings, recap and archive.
- Season standings track weeks won and total points for Remi, Jaiye and every challenger, with the
  Jaiye vs Remi record up top.
- A friend can join with just a name, pick from their phone, come back later, and show up on
  the weekly and season leaderboards. Nobody can see anyone's pick before it locks.
- `npm run build` passes, deployed, summary in #jaiye-build.

## Changes after confirmation

- Public names are **Jaiye** and **Remi** everywhere (never "Dad").
- Data source is ESPN's public API (schedule, scores, box scores, rosters). NBA's cdn.nba.com
  refuses requests from Vercel's servers. Still free, no key.
- Fan extras (no free text, nothing to moderate): emoji reactions on revealed picks, a weekly
  fan vote on who wins (Jaiye or Remi), and one optional line of trash talk on Jaiye's and
  Remi's own picks.
- Phase 2 ideas, not built: a Monday email to challengers (opt in, 13+ or a parent's email,
  unsubscribe link, needs an email service like Resend), and challenger comments (AI screened
  and held for approval).
