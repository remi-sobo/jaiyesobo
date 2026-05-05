# Prompt for the kemisobo.com Claude session

> Paste everything below the `---` line into the kemisobo.com session.
> The recipient won't see jaiyesobo's codebase or this conversation, so the
> prompt is fully self-contained.

---

## Context

You're working on the kemisobo.com Next.js project. We're building **the first /games section on Kemi's site**. It mirrors the look-and-feel of jaiyesobo.com/games but is its own product, hosted on its own Vercel project.

**Both sites share one Supabase database.** Same `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars. That's how a single admin runbook on jaiyesobo.com/admin can flip games on for Kemi here.

**The first (and only, for tonight) game is Think Tank** — deductive-logic grid puzzles for kids. Same engine that's used on Jaiye's homeschool curriculum, but here it's a free-play standalone game.

## What you're building

1. **`app/games/page.tsx`** — the public hub at kemisobo.com/games. Reads the shared `games` table, filtered through a per-kid audience config. Shows one card per game.
2. **`app/games/think-tank/page.tsx`** — picker for available puzzles. Lists every live `think_tank_puzzle` in `game_content` with a "play" link.
3. **`app/games/think-tank/[puzzleId]/page.tsx`** — the actual puzzle UI. A clue list + interactive Y/N grid. Validates the solve client-side, posts a record to `think_tank_solves` server-side.
4. **`/api/games/think-tank/solve` POST** — server-side validation against the `solution` field on the puzzle, idempotent insert into `think_tank_solves`.
5. **Reusable design tokens / shell** if you don't already have them — see Design section below.

Anything that's NOT a top-level public page (admin, lesson runners, kid-only `/me` views) is **not in scope** here. This is purely the public-facing /games on kemisobo.com.

## Schema you'll be reading + writing (already exists in shared Supabase)

### `games` table

```ts
type Game = {
  slug: string;          // primary key, e.g. "think-tank"
  title: string;         // "Think Tank"
  description: string;   // "Deductive logic puzzles for Kemi."
  status: "live" | "beta" | "archived" | "internal"; // 'internal' is hidden everywhere
  created_at: string;
};
```

### `game_content` table

Generic content store keyed by game. For Think Tank:

```ts
type GameContent = {
  id: string;            // uuid, used as puzzleId in URLs
  game_slug: string;     // 'think-tank'
  content_type: string;  // 'think_tank_puzzle'
  status: 'draft' | 'live' | 'archived';
  payload: SingleGridPuzzle | DoubleGridPuzzle;
  created_at: string;
};
```

**Puzzle payload shapes** (this is the literal JSON inside `payload`):

```ts
type SingleGridPuzzle = {
  title: string;          // "Three Friends, Three Lunches"
  intro: string;          // 1–2 sentence setup for the puzzle
  rows: string[];         // e.g. ["Sam", "Ava", "Maya"]
  row_label: string;      // "Friend"
  cols: string[];         // e.g. ["pizza", "sandwich", "sushi"]
  col_label: string;      // "Lunch"
  clues: string[];        // 2–6 plain-English clues
  solution: Record<string, string>; // { "Sam": "sandwich", ... }
  difficulty: "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";
  grid_type: "3x3" | "4x4";
  week_order: number;
};

type DoubleGridPuzzle = {
  title: string;
  intro: string;
  rows: string[];
  row_label: string;
  cols_a: string[];
  col_a_label: string;
  cols_b: string[];
  col_b_label: string;
  clues: string[];
  solution: Record<string, { bag: string; stuffy: string }>; // example shape; keys vary by puzzle
  difficulty: "hard";
  grid_type: "3x3-double";
  week_order: number;
};

type Puzzle = SingleGridPuzzle | DoubleGridPuzzle;
```

5 starter puzzles are already seeded by the jaiyesobo project; you're just reading them.

### `think_tank_solves` table

Per-user solve log. One row per (user_id, puzzle_id); replaying bumps `attempts`.

```sql
create table think_tank_solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  puzzle_id uuid references game_content(id) not null,
  task_id uuid references tasks(id),  -- nullable; only set when solved through a kid task
  solved_at timestamptz default now(),
  attempts int default 1,
  used_hints int default 0,
  unique(user_id, puzzle_id)
);
```

For free-play (no auth), we use anonymous sessions. See the next section.

### `app_config` table — `games_audience` row

This is the cross-site source of truth for which games show on which kid's hub.

```sql
-- key: 'games_audience', value:
{
  "jaiye": ["top-five", "trivia", "draft", "goat-roster", "word-search", "crossword", "draft-wheel"],
  "kemi":  ["think-tank"]
}
```

Read once on page load. Filter the `games` table down to `audience.kemi`.

If the row is missing entirely (cold-start scenario), Kemi's hub should render an empty state ("Nothing curated yet — check back soon"). The admin on jaiyesobo.com is responsible for seeding the row; you don't write it from this site.

### Anonymous sessions (so we can track solves without forcing login)

jaiyesobo.com already uses an `anon_sessions` table + `jaiye_games_session` cookie. Kemisobo should reuse the same pattern with its OWN cookie name to avoid cross-site collision:

```ts
// kemisobo cookie name
export const KEMISOBO_GAMES_COOKIE = "kemi_games_session";
```

```sql
-- already exists; do not re-create
create table anon_sessions (
  id uuid primary key default gen_random_uuid(),
  cookie_id text unique not null,
  display_name text default 'Anonymous',
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);
```

On first request, server-side route: read the cookie. If missing or no row matches, insert a new `anon_sessions` row, set the cookie. Best to do this from a route handler so the cookie can be written.

**Solves table** can either reference `users.id` (auth) or `anon_session_id` (anon). The current schema only has `user_id`, so for the anon path you can either:
- (a) extend the schema with `anon_session_id uuid references anon_sessions(id)` and adjust the unique constraint; or
- (b) skip server-side persistence for anon plays and just track them client-side via localStorage.

For tonight, **(b) is fine** — write a localStorage record `{ "think_tank_solves": [{ puzzle_id, solved_at, attempts }] }` so a returning visitor sees their own solve count without us needing a schema migration. We can add proper anon persistence later.

## Design system (must match jaiyesobo's /games)

CSS variables to define on `:root` in your global stylesheet. **These exact tokens** so a future merge between the two sites is painless:

```css
:root {
  --color-black: #0a0a0a;
  --color-off-black: #161616;
  --color-bone: #F5F1EA;
  --color-warm-bone: #ECE3D0;
  --color-mute: #8a8a8a;
  --color-warm-mute: #b3a797;
  --color-line: #2a2a2a;
  --color-line-strong: #444444;
  --color-card: #131313;
  --color-red: #E63946;
  --color-red-bright: #ff4555;
  --color-red-soft: #d04450;
  --color-games-yellow: #F5C842;
  --color-warm-bg: #1a1612;
  --color-warm-surface: #221c16;
  --color-warm-surface-2: #2a231b;
  --color-warm-surface-3: #322a20;
}

body {
  background: var(--color-black);
  color: var(--color-bone);
}
```

Fonts (load via `next/font`):
- **Fraunces** for display text (h1/h2 with `font-fraunces`). Use `font-black` for huge headings, italic + `font-normal` + red for the accent word.
- **JetBrains Mono** for labels, status pills, "uppercase 0.6rem tracking-[0.25em]" copy.
- System sans for body.

Visual idioms to use (these are what you'll see across Jaiye's games):

```tsx
// Section eyebrow
<div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
  kemisobo.com / games
</div>

// Display headline with red italic accent
<h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.04em]">
  Kemi&apos;s <span className="italic font-normal text-[var(--color-red)]">Games.</span>
</h1>

// Game card
<Link
  href={`/games/${slug}`}
  className="group bg-[var(--color-card)] border border-[var(--color-line)] rounded p-7 hover:border-[var(--color-games-yellow)] hover:-translate-y-0.5 transition-all"
>
  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)] mb-6 inline-flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-games-yellow)] animate-pulse" />
    Live
  </div>
  <h3 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.75rem,3vw,2.5rem)] leading-[0.95] tracking-tight mb-3">
    {title}
  </h3>
  <p className="text-[var(--color-mute)] text-[0.95rem] leading-relaxed">{description}</p>
</Link>
```

**Required attribution line, somewhere visible on every /games page:**

> *Curated by Jaiye Sobo, age 8 · A father-son project from East Palo Alto*

(Yes, even on Kemi's site — the credit line goes to both kids' platforms because it's the family brand. We'll iterate on the line for Kemi's games later.)

## /games hub flow

1. Read the `games_audience` config row from `app_config`.
2. If missing, render the empty state.
3. Otherwise, query `games` filtered to `slug IN audience.kemi`, ordered by `created_at`.
4. Skip rows where `status === 'archived'`. (Tonight, only `think-tank` will match anyway.)
5. Render one `GameCard` per row, linking to `/games/{slug}`.

```ts
// lib/games/audience.ts (mirrored from jaiyesobo)
import { createServiceClient } from "@/lib/supabase/server";

const KID_SLUG = "kemi";

export async function getGamesForKemi(): Promise<Game[]> {
  const supa = createServiceClient();
  const [{ data: cfg }, { data: games }] = await Promise.all([
    supa.from("app_config").select("value").eq("key", "games_audience").maybeSingle(),
    supa.from("games").select("*").order("created_at"),
  ]);
  if (!cfg?.value) return [];
  const audience = cfg.value as { jaiye?: string[]; kemi?: string[] };
  const allowed = new Set(audience.kemi ?? []);
  return (games ?? []).filter(
    (g) => allowed.has((g as { slug: string }).slug) && (g as { status: string }).status !== "archived"
  ) as Game[];
}
```

## /games/think-tank flow

1. Server-component fetches `game_content` rows where `game_slug='think-tank'`, `content_type='think_tank_puzzle'`, `status='live'`, ordered by `payload->>week_order`.
2. Render a list of puzzle cards. Each card shows the title, intro, and difficulty pill. Tapping links to `/games/think-tank/{id}`.
3. (Optional polish) For each card, read localStorage for prior solves and render a small "✓ solved · 2 attempts" badge.

## /games/think-tank/[puzzleId] flow

1. Server fetches the single `game_content` row by id (validate `game_slug` and `content_type`, 404 otherwise).
2. Pass the `payload` to a client component `ThinkTankPuzzle`.
3. Client component renders:
   - **Header**: title, intro paragraph, difficulty pill.
   - **Clues**: bulleted list, each clue full-width with a left-side `01 ·` mono number.
   - **Grid**: `rows.length × cols.length` cells. Each cell can be in three states (Y / N / blank). Cycle on click. (For 3x3-double, render TWO grids side-by-side: one for `cols_a`, one for `cols_b`.)
   - **Submit button**: "Lock it in" — disabled until exactly one Y per row AND one Y per column for each grid.
   - On submit, call `POST /api/games/think-tank/solve` with `{ puzzle_id, answer }` where `answer` mirrors the `solution` shape.
4. Response `{ correct: boolean, attempts: number }`. On `correct=true`, fade in a celebration: "Locked. **Correct.**" + restart link. On `correct=false`, shake the wrong cells, decrement an attempts counter, let the player try again.

### Grid component sketch

```tsx
type CellState = "Y" | "N" | null;

function GridCell({ state, onCycle }: { state: CellState; onCycle: () => void }) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className={`w-12 h-12 border border-[var(--color-line)] flex items-center justify-center font-[family-name:var(--font-fraunces)] text-2xl transition-colors ${
        state === "Y" ? "bg-[var(--color-games-yellow)]/20 text-[var(--color-games-yellow)]"
          : state === "N" ? "bg-[var(--color-card)] text-[var(--color-mute)]"
          : "bg-transparent"
      }`}
    >
      {state === "Y" ? "✓" : state === "N" ? "✗" : ""}
    </button>
  );
}
```

Use a 2D state array: `cells[rowIndex][colIndex]: CellState`. Cycling: null → Y → N → null.

### Validation rule (client-side, before enabling Submit)

For a `3x3` puzzle: each row must have exactly one Y, each column must have exactly one Y. (No constraint on N — those are just bookkeeping.)

For `3x3-double`: each grid (rows × cols_a, rows × cols_b) must independently satisfy the same rule.

### POST /api/games/think-tank/solve (server route)

```ts
// app/api/games/think-tank/solve/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.puzzle_id !== "string" || !body.answer) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const supa = createServiceClient();
  const { data: row } = await supa
    .from("game_content")
    .select("payload")
    .eq("id", body.puzzle_id)
    .eq("content_type", "think_tank_puzzle")
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payload = row.payload as { solution: unknown };
  const correct = JSON.stringify(payload.solution) === JSON.stringify(body.answer);
  return NextResponse.json({ correct });
}
```

(Server-side persistence of solves is out of scope for tonight — see the localStorage fallback note above.)

## Sequence to ship

1. **Layout/tokens**: confirm CSS variables + fonts are in place; if not, add them.
2. **`/games`**: read audience config, render `GameCard` list.
3. **`/games/think-tank`**: list puzzles.
4. **`/games/think-tank/[id]`**: full puzzle UI with clue list + grid + submit.
5. **`/api/games/think-tank/solve`**: server validates against `payload.solution`.
6. **Verify**:
   - Open `/games` — Think Tank card visible.
   - Tap → `/games/think-tank` shows 5 puzzles.
   - Tap one → grid renders, clues readable.
   - Solve correctly → "Correct" celebration.
   - Solve incorrectly → cells indicate wrong, attempts counter ticks.
7. **Build + deploy** (Vercel auto-deploys on push to main).
8. **Test on iPad Safari** (the kid will play on touch).

## Things you should NOT do

- Don't build an admin / curator interface. Puzzle authoring stays on jaiyesobo.com (Jaiye's curator UI). You're a read-only consumer of `game_content`.
- Don't write to the `app_config['games_audience']` row — that's owned by jaiyesobo's admin panel.
- Don't add a /me, /admin, or auth flow yet.
- Don't auto-pull a "daily puzzle" — let the player browse and pick.

## Required env vars on Vercel

Same Supabase project as jaiyesobo:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Should already be set on this Vercel project; just confirm.

## When you're done

Reply with:
- The PR/commit URL.
- A note on whether the audience config row was already seeded (you should have read a non-null value).
- Any deviations from the spec above and the reason for each.

Build it tight. Ship it tonight.
