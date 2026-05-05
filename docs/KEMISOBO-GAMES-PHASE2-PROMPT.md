# Prompt: bring more games to kemisobo.com — Disney edition

> Paste everything below the `---` line into the kemisobo.com Claude session.
> Self-contained — recipient won't see jaiyesobo's codebase or this conversation.

---

## Where we are

Think Tank is shipped on `kemisobo.com/games`. It works. Kemi loves it. Time to grow the platform.

This brief covers **two phases**, in order of priority:

**Phase A — direct ports (proven mechanics, new content):**
1. Word Search — themed packs around Disney
2. Crossword — generated from the same word packs

**Phase B — adaptations (proven mechanics, repointed at Kemi's voice):**
3. Top 5 — list-making with a creative-director judge instead of a scorekeeper
4. (Optional) Draft / Cast Call — build a "dream cast" or "perfect princess crew", AI writes a review not a verdict

Build A first. Ship A. Then come back for B.

## Who Kemi is — and why the voice matters

Kemi is **7, a performer and a maker**. She loves to dress up, do shows, sing along to soundtracks, draw, story-tell. She likes games but **not for the win** — for the moment, the cast, the choices, the look. The AI on her site should match.

**Voice reset (this is the most important section in the brief):**

| What we use on jaiyesobo.com           | What we use on kemisobo.com                    |
| -------------------------------------- | ---------------------------------------------- |
| Mike Breen the NBA play-by-play caller | "The Director" — a warm, theatrical observer   |
| "BANG!" "Got cooked." "Best-of-7."     | "What a cast." "I see your vision." "Curtain." |
| Winner / loser verdict                 | Spotlight notes — what the choices reveal      |
| Numeric rating + grade                 | Vibes notes + a metaphor (it's a sleepover playlist, a Saturday-morning museum room, a curtain call) |
| "Don't get cooked"                     | "Take the stage"                               |

The AI never picks a winner unless the game is structurally a contest (and on Kemi's side, almost nothing is). It names what's special, suggests a scene the choices remind it of, keeps it warm and short. **No saccharine.** No "what a great list, sweetie!" — Kemi is sharp, and an over-sweet voice will read as condescending. Think Anna Wintour but kind. Or RuPaul if RuPaul did kids' film reviews. Generous, observant, specific.

If you find yourself writing the word "amazing" in AI output, delete it.

## Color scheme — Kemi's, not Jaiye's

Jaiye's site is warm-black + red + gold (masculine, sports). Kemi's site needs its own tokens. **Do not** just swap the red for pink.

Suggested palette (anchored on the magenta her brand already uses in shared admin UI):

```css
:root {
  /* Background + neutrals */
  --color-black: #1a0e16;            /* deep aubergine-black, not pure black */
  --color-off-black: #221520;
  --color-card: #2a1c25;
  --color-bone: #FBEDE6;             /* warm cream, slightly peachy */
  --color-warm-bone: #F2DDD0;
  --color-mute: #9a8086;
  --color-warm-mute: #b59b9f;
  --color-line: #3a2a32;
  --color-line-strong: #5a4248;

  /* Brand */
  --color-magenta: #C83C78;          /* her established accent */
  --color-magenta-bright: #E04F8E;
  --color-plum: #6E3B6E;             /* secondary, deeper */
  --color-gold: #E8B548;             /* warm gold, not yellow */
  --color-mint: #8FCFB6;             /* fresh accent for "live" / success */
  --color-lavender: #C9B6E0;         /* tertiary, used sparingly */
}

body { background: var(--color-black); color: var(--color-bone); }
```

Headline accent uses **magenta italic** (the analog of Jaiye's red italic):

```tsx
<h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.04em]">
  Kemi&apos;s <span className="italic font-normal text-[var(--color-magenta)]">Games.</span>
</h1>
```

Live pulse uses **gold** instead of yellow. Success pulse uses **mint**. Avoid pastel pink — leans too much into the cliché. Magenta + cream + plum + gold reads "stage" not "nursery."

## Brand line on every page (still required)

> *Curated by Kemi & Jaiye Sobo · A father-daughter project from East Palo Alto*

(Two kids, one family — the audience benefits from knowing it's a sibling brand.)

## How games get registered (cross-site)

You already learned this from the Think Tank build. Reminder:

- All games live in the shared Supabase `games` table (slug primary key).
- The `app_config['games_audience']` JSON row decides who sees what:
  ```json
  { "jaiye": [...], "kemi": ["think-tank", "word-search-disney", "crossword-disney", ...] }
  ```
- Kemisobo READS this row. Adds nothing to it directly. The actual flip happens from jaiyesobo.com/admin/setup → "Who plays what." panel.
- For new games you build on this side, **insert a row into `games`** (status='live'), then ping me to flip it onto Kemi's audience from Jaiye's admin. Or use a slug like `*-disney` to make the namespace obvious — that's the pattern below.

## PHASE A — port Word Search + Crossword (high priority)

These two share content. Build the content layer once, two games run off it.

### Schema you need (already exists in Supabase from jaiyesobo)

```ts
// game_content stores the word packs.
type GameContent = {
  id: string;
  game_slug: 'word-search-disney' | 'crossword-disney';
  content_type: 'word_pack';
  status: 'draft' | 'live' | 'archived';
  payload: WordPack;
  created_at: string;
};

type WordPack = {
  // Identity
  theme_slug: string;              // e.g. "frozen", "princesses", "encanto"
  title: string;                   // "Frozen — Find them all"
  subtitle?: string;               // optional flavor line
  difficulty: 'easy' | 'medium' | 'hard';

  // Word list
  words: string[];                 // 8-14 words. Uppercase, A-Z only. No spaces.
  hints: Record<string, string>;   // { "ELSA": "Anna's older sister", ... } — used by Crossword

  // Word Search grid (generated, optional)
  grid_size: number;               // 12 or 14
  grid?: string[];                 // pre-generated; optional. Generator can regenerate from words.

  // Crossword grid (generated, optional — built by the crossword placer)
  crossword_grid?: {
    size: number;
    cells: ({ ch: string; number?: number } | null)[][]; // null = black square
    placements: { word: string; row: number; col: number; dir: 'across' | 'down'; number: number }[];
  };
};
```

### Content to seed (you write these as JSON; I'll provide starter content below)

Six starter packs. Mix difficulties. Generate the actual grids with the algorithms (see below).

1. **`princesses`** — easy — title "Disney Princesses"
   Words: ELSA, ANNA, BELLE, ARIEL, MULAN, MOANA, TIANA, RAPUNZEL, JASMINE, MERIDA, AURORA
   Hints (for crossword): ELSA → "Sister who built her own ice castle"; ANNA → "Princess from Arendelle who never gave up"; BELLE → "Loved books and a Beast"; ARIEL → "Mermaid who wanted to walk on land"; MULAN → "Saved China dressed as a soldier"; MOANA → "Sailed past the reef to find Te Fiti"; TIANA → "Wished on a star and ran a restaurant"; RAPUNZEL → "Let her hair down from the tower"; JASMINE → "Princess of Agrabah who flew on a magic carpet"; MERIDA → "Brave princess who could shoot an arrow"; AURORA → "Sleeping Beauty who pricked her finger"

2. **`frozen`** — easy-medium — title "Frozen — find them all"
   Words: ELSA, ANNA, OLAF, SVEN, KRISTOFF, HANS, SVEN, ARENDELLE, AHTOHALLAN, NOKK
   Hints: ELSA → "Builds a palace of ice"; ANNA → "Sister who always believes"; OLAF → "Snowman who likes warm hugs"; SVEN → "Reindeer best friend"; KRISTOFF → "Iceman who loves Sven"; HANS → "Prince who turned out to be the bad guy"; ARENDELLE → "The kingdom by the fjord"; AHTOHALLAN → "The river that holds memories"; NOKK → "The water spirit horse"
   *(Drop SVEN duplicate from final list.)*

3. **`encanto`** — medium — title "Welcome to the Casita"
   Words: MIRABEL, BRUNO, ISABELA, LUISA, CAMILO, DOLORES, ANTONIO, ABUELA, AGUSTIN, JULIETA, PEPA, FELIX
   Hints: MIRABEL → "Has no gift but holds the family together"; BRUNO → "We don't talk about him"; ISABELA → "Grows beautiful flowers"; LUISA → "Carries the weight of the world"; CAMILO → "Shape-shifter cousin"; DOLORES → "Hears every whisper"; ANTONIO → "Talks to animals"; ABUELA → "The grandmother who lit the candle"; JULIETA → "Heals you with her food"; PEPA → "Her mood is the weather"; AGUSTIN → "Mirabel's clumsy dad"; FELIX → "Pepa's loving husband"

4. **`moana`** — easy-medium — title "Beyond the Reef"
   Words: MOANA, MAUI, TAMATOA, TEKA, TEFITI, HEIHEI, PUA, MOTUNUI, KAKAMORA
   Hints: MOANA → "Wayfinder from Motunui"; MAUI → "Demigod with the magical hook"; TAMATOA → "Glittery crab who loves shiny things"; TEKA → "The lava monster"; TEFITI → "Mother island whose heart was stolen"; HEIHEI → "The very confused chicken"; PUA → "Loyal little pig"; MOTUNUI → "Moana's home island"; KAKAMORA → "Tiny coconut pirates"

5. **`disney_songs`** — medium — title "Belt It Out"
   Words: LETITGO, REFLECTION, COLORSOFTHEWIND, HOWFARILLGO, ALMOSTTHERE, INTOTHEUNKNOWN, REMEMBERME, SURFACEPRESSURE, WALKAWAY
   Hints: LETITGO → "Elsa's runaway anthem"; REFLECTION → "Mulan asks who she is in the mirror"; COLORSOFTHEWIND → "Pocahontas teaches a lesson in nature"; HOWFARILLGO → "Moana wonders past the reef"; ALMOSTTHERE → "Tiana sings about her dream restaurant"; INTOTHEUNKNOWN → "Elsa hears something calling"; REMEMBERME → "Coco's lullaby across worlds"; SURFACEPRESSURE → "Luisa cracks under the weight"; WALKAWAY → "Asha takes a stand in Wish"
   *(Note: titles run together — long words make for a meatier search.)*

6. **`villains`** — hard — title "Don't Trust Them"
   Words: MALEFICENT, URSULA, JAFAR, SCAR, HADES, CRUELLA, GASTON, EVILQUEEN, MOTHERGOTHEL
   Hints: MALEFICENT → "Sleeping Beauty's curse-thrower"; URSULA → "Sea witch with a deal"; JAFAR → "Aladdin's snake-tongued vizier"; SCAR → "He couldn't wait to be king"; HADES → "Underworld boss in Hercules"; CRUELLA → "Wanted Dalmatian fur coats"; GASTON → "Beauty's chest-thumping suitor"; EVILQUEEN → "Snow White's apple-poisoner"; MOTHERGOTHEL → "Locked Rapunzel in the tower"

Refresh the list any time — new movies (Wish, Inside Out 2, soon Moana 2) make great packs. The kid will tell you which ones she wants.

### Word Search build

Pattern (do this even if you reverse-engineered it from another source):
- Server-side: when curator publishes a pack, generate a `grid_size × grid_size` letter grid with each word placed in one of 8 directions, then fill blanks with random A-Z. Save into `payload.grid`.
- Game UI: render the grid as a click/drag selection interface. Track found words. When a word is selected (start cell + end cell define a line), check if it matches one of `payload.words` — if so, mark as found and persist into the play row.
- Win condition: all words found OR timer runs out. Director's note appears at end with vibes commentary, not a numeric score (see voice section).
- Routes: `/games/word-search-disney` (theme picker — list of packs), `/games/word-search-disney/[themeSlug]` (active game).

Performance target: should feel snappy on iPad Safari. No janky drag.

### Crossword build

Pattern:
- Server-side generator places words from the same `payload.words` array onto a grid, scored by intersections. Greedy backtracker, deterministic (same input → same output). Drops words that can't legally place.
- Numbers cells in row-major order. Stamps numbers onto each placed word.
- Game UI: grid + clue list (Across, Down). Tap a clue → focus the run. Tap a cell → focus and highlight the word. Type letters to fill. Auto-advance to next cell.
- Win condition: all cells filled correctly. Director's note appears.
- Routes: `/games/crossword-disney` and `/games/crossword-disney/[themeSlug]`.

Reuse the same word_pack content rows. Add a per-pack `crossword_grid` field on publish (don't regenerate every play).

### Director's note shape (used by both games at end)

```ts
type DirectorsNote = {
  // The vibe metaphor — one short noun phrase.
  vibe: string;            // "A Saturday-morning museum room" / "An encore that earned the wig toss" / "A standing ovation for the brave choices"
  // 1-2 sentences naming what was special. References specific picks.
  notes: string;           // ≤45 words, no exclamation points
  // Optional: a "next pack" suggestion based on what they just played.
  next_suggestion?: string; // ≤16 words
};
```

Returned from a small AI route (`POST /api/games/director`). System prompt for that route:

```
You are The Director — a warm, theatrical observer. You write a 1-2 sentence
note about a game just finished, naming what was specific about the player's
performance. Reference real items they picked, words they found, etc.
You DO NOT pick winners or losers. You DO NOT use the word "amazing" or
"awesome." You speak like a generous mentor who's been in showbiz forever.
Keep it under 45 words. Output JSON only:
{ "vibe": "...", "notes": "...", "next_suggestion": "..." }
```

Use Anthropic SDK (`@ai-sdk/anthropic`) with `claude-sonnet-4-6`. ~300 max output tokens.

## PHASE B — Top 5 reframed as "Spotlight" (medium priority)

If A is solid, build this. Same engine as jaiyesobo's Top 5, different vocabulary.

### Game name: **Spotlight**

Subtitle: *"Pick five. The Director sees you."*

### Routes

- `/games/spotlight` — pick a prompt
- `/games/spotlight/[promptId]` — play (5 picks + submit)
- `/games/share/[token]` — shareable result

### Content

A `game_content` row per prompt:

```ts
{
  game_slug: 'spotlight',
  content_type: 'spotlight_prompt',
  status: 'live',
  payload: {
    text: string;           // "Top 5 Disney princesses" or "Top 5 Disney songs to belt"
    flavor: string;         // 1-line vibe hint shown above the prompt
    category_tag: string;   // 'princess' | 'song' | 'villain' | 'sidekick' | 'movie' | 'fashion'
  }
}
```

Starter prompts (seed 25 to launch):
1. Top 5 Disney princesses (any reason — story, song, vibe, your call)
2. Top 5 Disney songs to belt
3. Top 5 Disney villains who are kinda right
4. Top 5 most fashionable Disney characters
5. Top 5 sidekicks who steal the show
6. Top 5 Disney movies for a sleepover
7. Top 5 movies where the princess saves herself
8. Top 5 Disney parents who actually show up
9. Top 5 castles you'd want to live in
10. Top 5 Disney moms (any era, any vibe)
11. Top 5 best Disney sister-pairs
12. Top 5 Disney pets you'd adopt
13. Top 5 Disney songs that make you cry
14. Top 5 Disney characters who'd be great DJs
15. Top 5 Disney duos that should team up
16. Top 5 most underrated Disney princesses
17. Top 5 Disney movies with the best ending
18. Top 5 Disney fits (outfits) you'd actually wear
19. Top 5 dance scenes
20. Top 5 villain songs (yes Hades counts)
21. Top 5 Disney castles, ranked by views
22. Top 5 Disney movies you'd want a sequel to
23. Top 5 magical objects (slipper, lamp, mirror, candle, tiara…)
24. Top 5 Pixar movies that hit harder than they should
25. Top 5 Disney moments that made you scared (in a good way)

### How the AI judges (it doesn't)

Same JSON shape as jaiyesobo's Top 5 but field names changed:

```ts
type SpotlightVerdict = {
  vibe: string;             // metaphor for the list as a whole, ≤8 words
  notes: string;            // 1-2 sentences naming TWO specific picks and what they reveal, ≤55 words
  cast_or_crew: 'cast' | 'crew' | 'both' | 'mood' | 'mixed-bag'; // playful classification of the list
  star_pick?: string;       // the one pick that surprised The Director (optional, by name)
};
```

System prompt:

```
You are The Director — a warm, theatrical observer. You're reading a kid's
top-5 list. You name TWO specific picks (using the actual item text from the
list) and what they reveal about her taste. You give the list a one-phrase
vibe. You DO NOT score. You DO NOT pick a winner. You DO NOT say "amazing"
or "awesome." 50 words max. Output JSON only.
```

Display: vibe metaphor as the headline, notes as italic body, "star pick" highlighted with a magenta dot.

## Patterns to mirror from the jaiyesobo /games stack

You already have these on this side from the Think Tank build. Reuse them — same shape:

- `GameShell` wrapper component (top gradient bar, header, footer with credit line). Update tokens to match Kemi's palette.
- `GameCard` for the hub. Status pill in **gold** (not yellow). Live dot in **mint**.
- `lib/games/audience.ts` already filters by `kemi`. New games auto-appear once registered + audience-flipped.
- `lib/games/data.ts` for `getPlayByToken` / `shareToken` etc.
- `lib/games/session.ts` for the anon-session pattern (use `kemi_games_session` cookie).

If any of those don't yet exist on this side, port them over from the patterns referenced in the Think Tank prompt. Don't re-invent.

## Sequence to ship Phase A

1. **Tokens + shell**: confirm Kemi palette is in `globals.css`. Update `GameShell` and `GameCard` to use magenta + gold + mint. Verify the credit line on every page.
2. **Content layer**:
   - Insert the 6 word packs into `game_content` (status='live'). Each pack gets a fresh UUID, `game_slug='word-search-disney'`, `content_type='word_pack'`, payload as defined above.
   - Run the Word Search grid generator for each pack; persist `payload.grid`.
   - Run the Crossword grid generator for each pack; persist `payload.crossword_grid`.
3. **Word Search game**: theme picker → grid game → director's note end screen.
4. **Crossword game**: theme picker → crossword game → director's note.
5. **Register the games** in the `games` table:
   ```sql
   insert into games (slug, title, description, status) values
     ('word-search-disney', 'Word Search', 'Themed Disney word hunts. Find them all.', 'live'),
     ('crossword-disney', 'Crossword', 'Disney clues, one grid. Try to fill it.', 'live')
   on conflict (slug) do nothing;
   ```
6. **Tell me to flip the audience** — I'll add `'word-search-disney'` and `'crossword-disney'` to Kemi's column on jaiyesobo.com/admin/setup. They appear on her hub.
7. Test on iPad Safari with Kemi.
8. **Move to Phase B** when she's stamped Phase A.

## What you should NOT do

- **Don't write to `app_config['games_audience']`** — that's owned by jaiyesobo's admin.
- **Don't build a curator UI** — content authoring stays on jaiyesobo's `/games-admin`. (Talk to me when she wants new packs; I'll add them via the existing word-pack curator and they'll auto-appear here.)
- **Don't ship without a director's note** at the end of each game. The voice IS the product.
- **Don't auto-generate a "daily pack"** — let her browse and pick. She likes the choosing.
- **Don't use exclamation points in AI output**. Once you start, you can't stop, and the whole tone collapses.

## Required env vars (already on this Vercel project)

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (shared with jaiyesobo)
- `ANTHROPIC_API_KEY` (for The Director routes)

## When you're done with Phase A

Reply with:
- PR/commit URLs.
- Screenshot of `/games`, one of `/games/word-search-disney` mid-game, one of an end-game director's note.
- A note on which packs needed grid-tweaks (some words may not fit; the Crossword placer drops them — log which got dropped per pack).
- Anything that felt off voice-wise so I can refine the prompt.

Build it warm. Ship it tight. The kid will love it.
