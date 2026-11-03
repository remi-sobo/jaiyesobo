# Run It Back Picks: iPhone app and growth spec

Phase 1 built Oct 25 2026 (branch phase-1-growth). Builds on `docs/SOBO-SPORTSBOOK-SPEC.md`, which still describes the
weekly loop, pick types, grading and the existing tables. Nothing in that loop changes.

## 1. What we're building

Run It Back Picks is the NBA pick'em on jaiyesobo.com/runitback, grown into an iPhone app.
People battle each other all season. The headline league is **Beat Jaiye & Remi**: every
player is in it automatically. Players also start private leagues with their own people.

- **Website (free forever):** weekly slate, Lock of the Week, Beat Jaiye & Remi board,
  join any league, reactions, preset trash talk.
- **iPhone app (free download):** everything on the website plus push alerts.
- **Season Pass ($1.99, one time per season, iPhone only):** create leagues, full
  rivalry records and history, all share card styles, Jaiye's audio recap, pass badge.
  Paying never changes points, picks or rank.

One account works everywhere. The player code (HOOP-7342) moves a player between the
website and the app.

The approved look is the Claude Design prototype "Run It Back Picks App" (revised round).
Match it. Dark #0B0B0C, red #E5312B, Fraunces / Inter / JetBrains Mono, CALLED IT stamp.

## 2. Build phases

Ship one, watch it, then build the next.

| Phase | Where | What | Done means |
| --- | --- | --- | --- |
| 1. Backend and website growth | jaiyesobo repo | Leagues, invites, rivalries, preset trash talk, reports and mutes, week scores, app API, account deletion, age band | Website players can create (admin only until Phase 3), join and play leagues; invite links work; rivalries show; app API passes its tests |
| 2. The app, core | `mobile/` in this repo | Expo app: onboarding, This Week, pick cards, Lock, reveal card, leaderboard, leagues, Jaiye's Corner, profile, settings, delete account | Installed on Remi's and Jaiye's phones through TestFlight, playing the live week |
| 3. Alerts and the pass | both | Push alerts, Season Pass purchase, paywall, share cards, Monday results sequence, commissioner nudges | TestFlight beta with current players for 2 to 3 weeks |
| 4. Store ready | both | Age range checks, privacy and terms pages, App Store assets, review notes | Submitted to App Review |

## 3. Phase 1: backend and website (jaiyesobo repo)

### 3.1 Data (one new migration, `027_run_it_back_growth.sql`)

New tables:

- `sb_leagues`: `id uuid pk`, `name text` (3 to 30 chars, same name filter as display names),
  `code text unique` (like `SOBO-2291`: a word from a list plus 4 digits),
  `commissioner_id uuid → sb_players`, `season text`, `created_at`, `archived boolean default false`.
- `sb_league_members`: `league_id`, `player_id`, `joined_at`, `invited_by uuid null → sb_players`,
  `removed boolean default false`; primary key `(league_id, player_id)`. Max 50 members per league.
- `sb_trash_talk`: `id`, `item_id`, `player_id`, `line_key text`, `created_at`; unique `(item_id, player_id)`.
  Only allowed after the item locks. `line_key` must be one of the preset lines in code.
- `sb_reports`: `id`, `reporter_id`, `target_player_id`, `context text` (`name` | `talk` | `league_name`),
  `ref_id uuid null`, `created_at`, `resolved boolean default false`.
- `sb_mutes`: `player_id`, `muted_player_id`, primary key both. Muted players' trash talk is hidden for that player.
- `sb_app_sessions`: `id`, `player_id`, `token_hash text unique`, `created_at`, `last_used_at`, `revoked boolean`.
  The app stores a random 32 byte token; only its SHA-256 is stored.

New columns on `sb_players`:
`age_band text null` (`13_plus` | `under_13`), `has_pass boolean default false`,
`pass_season text null`, `pass_purchased_at timestamptz null`,
`push_token text null`, `push_enabled jsonb default '{"lock":true,"reveal":true,"graded":true,"recap":true}'`,
`platform text default 'web'`, `deleted_at timestamptz null`, `last_seen_at timestamptz null`.

RLS on every new table, no public access. All reads and writes go through server routes with the
service client, same as today.

### 3.2 Rules

- **Headline league** is not a row. Everyone who isn't hidden or deleted is in it.
- **Rivalry:** two players are rivals once both have scores in the same final week. Record = weeks
  where one scored more than the other (ties counted separately). Show the 8 players you share the
  most weeks with, plus Jaiye and Remi always first. Computed from picks in final weeks, the same
  way season standings are (built: no separate score table, so nothing can drift).
- **Closest rival this week:** the player in any of your leagues whose live total is nearest yours.
- **Creating a league** requires `has_pass` for the current season. Until Phase 3, only admin can
  create leagues (so the website and the beta can test them). Joining is always free.
- **Invite links:** `jaiyesobo.com/runitback/l/{code}?from={player_code}`. Opening it shows who
  challenged you, the league, its size and the week. On the website a new visitor fills one form
  (name and age) that joins the game and the league, then lands on the picks. The app does pick
  first, name after. On iPhone with the app installed, the same URL opens the app (Phase 2 adds
  the Associated Domains file at `/.well-known/apple-app-site-association`).
- **Preset trash talk:** 16 lines in `lib/sportsbook/talk.ts`, one per player per revealed pick.
  No free text anywhere. Starting list: "Somebody check on Remi." "Called it. Again." "Y'all aren't
  ready." "Respect the upset." "I'm running it back." "That one hurt." "Never doubt me." "Lucky.
  That's all." "Jaiye knew." "Told you." "Not my best work." "See you Monday." "Ice cold."
  "Who had this?" "Wrong side, right heart." "Bench me."
- **Reports:** report a display name, a league name or a trash talk line. Open reports from three
  different people hide that player from every board until Remi reviews it in admin.
- **Age band:** asked once at join: "Are you 13 or older?" Under 13 can still play with a nickname
  (same as today) but can't post trash talk, can't create leagues, and the app gets no push token for
  them. Final rule waits on the lawyer (see open decisions).
- **Delete account:** removes name, code, push token, sessions, league memberships and trash talk;
  sets `deleted_at`; past picks stay anonymous so old boards still add up.
- **No betting words.** Add a check in the slate and recap AI prompts: never use bet, odds, wager,
  sportsbook, parlay, payout, pays, cash, juice. Points are "worth", never "pay". Also sweep the
  website copy.

### 3.3 App API (`/api/app/v1/...`)

JSON in and out. Every request and response shape is typed in `lib/app-api/types.ts` (no Next.js or
server imports) so the app in `mobile/` can import the same types. Auth is `Authorization: Bearer <token>` resolved through `sb_app_sessions`.
Every route rate limited like the current join route. Errors are `{ error: "<message for a person>" }`.

| Method and path | What |
| --- | --- |
| POST `/session/join` | `{ name, age_band }` → new player, returns `{ token, player }` |
| POST `/session/restore` | `{ code }` → existing player (website players moving to the app) |
| DELETE `/session` | sign out this device |
| GET `/me` | player, pass status, settings, leagues |
| PATCH `/me` | display name, push token, push settings |
| DELETE `/me` | delete account |
| GET `/week/current` and `/week/{season}/{n}` | slate with my picks, reveal state, live points, hosts' picks after lock |
| POST `/picks` | `{ item_id, choice?, guess?, is_lock? }` same rules as website |
| POST `/picks/submit` | `{ week }` |
| GET `/board?league={id or headline}&span=week|season` | ranked rows, my row, beat-J&R flags, headline stat line |
| GET `/leagues` · POST `/leagues` · POST `/leagues/join` `{ code }` | list, create (pass), join |
| GET `/leagues/{id}` | board, members, and for the commissioner: who has picked this week |
| PATCH `/leagues/{id}` · DELETE `/leagues/{id}/members/{player}` | commissioner rename, remove |
| POST `/leagues/{id}/nudge` | `{ player_id? }` commissioner nudge (push in Phase 3, no-op before) |
| GET `/rivals` · GET `/rivals/{player}` | records and week by week |
| GET `/results/{season}/{n}` | Monday sequence data: totals, who beat J and R, rivalries, rank changes, best call, worst miss |
| POST `/talk` · POST `/react` | preset line, emoji |
| POST `/report` · POST `/mute` | safety |
| GET `/invite/{code}` | public, no auth: league name, size, inviter display name |
| GET `/recap/current` | Jaiye's text recap and audio URL if posted, plus the featured week's On The Court episode (`episode`, null until one is posted) |
| POST `/pass/verify` | Phase 3 |

Write tests for the scoring paths that matter: lock rules, week scores, rivalry records, league
board ranks, deleted players.

### 3.4 Website changes

- `/runitback/l/[code]` invite landing.
- `/runitback/leagues` and `/runitback/leagues/[id]`: my leagues and a league board.
- League switcher on `/runitback` (Beat Jaiye & Remi plus my leagues).
- Rivalries block on the player view.
- Preset trash talk and report menu on revealed picks.
- "Get alerts on the iPhone app" banner (hidden until Phase 4 launch, behind a flag).
- Admin: reports queue, league list, pass holders.
- `/runitback/privacy`, `/runitback/terms`, `/runitback/support`, `/runitback/parents` pages
  (copy drafted separately, reviewed by a lawyer before launch).

## 4. Phase 2: the app (`mobile/` folder in this repo)

The app lives in this repo so Claude Code sees the backend, the API and the app together.

- `mobile/` is its own Expo project with its own `package.json` and lockfile. Not an npm
  workspace: the website and the app install separately, so their dependencies never collide.
- The website build ignores it. Add `mobile` to the `exclude` list in the root `tsconfig.json` and
  ESLint config, and add an `ignoreCommand` to `vercel.json` so a commit that only touches
  `mobile/` doesn't rebuild the website:
  `"ignoreCommand": "git diff HEAD^ HEAD --quiet -- . ':(exclude)mobile'"`.
- Shared API types live in `lib/app-api/types.ts` with no Next.js or server imports. The app imports
  them through a path alias (`@shared/*` → `../lib/app-api/*`) set in `mobile/tsconfig.json` and
  Metro's `watchFolders`. One source of truth for request and response shapes.
- EAS builds run from `mobile/` (`eas.json` there). Commit messages for app work start with `app:`.
- If the app ever outgrows the site, `git subtree split` moves `mobile/` to its own repo with history.

- Expo (latest SDK), Expo Router, TypeScript, EAS Build and Submit. No Mac needed.
- Bundle id `com.sobo.runitback` (confirm). Display name "Run It Back".
- Screens from the approved prototype. All data from the App API. Optimistic pick saves with
  retry; an offline banner.
- Token in `expo-secure-store`. "Have a player code?" restore on onboarding.
- Universal links for `jaiyesobo.com/runitback/l/*`.
- iOS share sheet for share cards (render the card with `react-native-view-shot`).
- Jaiye's audio with `expo-audio`.
- Dark only. Fonts bundled. Respect Dynamic Type up to one step larger. VoiceOver labels on every control.
- Settings: notifications, display name, player code, privacy, terms, parents, contact, delete account.

## 5. Phase 3: alerts and the pass

- **Push** through Expo push service. Cron jobs on Vercel:
  - 30 minutes before each lock, to players with that pick still open.
  - At each reveal, to players who picked it ("Picks revealed. Jaiye took the upset.").
  - Monday after finalize: "Week 6 is graded. You beat Remi by 4."
  - Monday recap posted.
  - Commissioner nudges, max one per player per day.
- **Season Pass:** non-consumable in-app purchase `season_pass_2026_27` at $1.99. Use RevenueCat
  (free at this size) with a webhook to `/api/app/v1/pass/webhook` that sets `has_pass`. Restore
  Purchases on the paywall and in settings. Paywall shows only when a pass feature is tapped,
  never before a first slate is submitted.
- **Share cards:** me vs Jaiye & Remi, head to head, loss.
- **Monday results sequence** and **commissioner tab** from the prototype.

## 6. Phase 4: store ready

- Apple's Declared Age Range API and parental consent flow for states that require it (Texas now).
  Use or write an Expo native module.
- Privacy manifest, encryption export answer (HTTPS only).
- App Store assets and copy from the launch checklist.
- Review notes with a test player code.

## 7. Not in this build

- Other sports. Live in-game scores. Free text of any kind. Prizes of any kind.
- Android (Expo makes it possible later).
- Subscriptions.

## 8. Open decisions

- Under 13 accounts: nickname only as today, or 13+ only. Lawyer decides before Phase 4.
- Bundle id and the Apple developer account name (SOBO Consulting LLC).
- Whether the website ever lets pass holders create leagues there too.
