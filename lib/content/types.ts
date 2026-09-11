/**
 * Content model for the public site (Vol. 02).
 *
 * Everything a visitor reads on /, /column, /pod, /now, /games and /about
 * comes from these types. It's plain typed data rather than MDX or a CMS:
 * the volume is small, it wants to be reviewable in a diff, and it matches
 * how `lessons/` already works.
 *
 * Note this is editorial content only. The `/me` app, lessons and admin have
 * their own Supabase-backed data in `lib/data.ts` and `lib/schedule.ts` and
 * never touch anything here.
 */

/** A paragraph of a column post, or a block that breaks the prose up. */
export type Block =
  | { kind: "p"; text: string }
  /** The boxed chant/quote block. `accentLast` paints the final line red. */
  | { kind: "pull"; lines: string[]; accentLast?: boolean }
  /** A handwritten margin note. Budget: one or two per article, no more. */
  | { kind: "note"; text: string };

export type PostStatus = "published" | "draft";

export type Post = {
  number: number;
  slug: string;
  title: string;
  /** The one phrase inside `title` set in italic red. Must occur in title. */
  titleAccent?: string;
  standfirst: string;
  /** Index-page summary when it differs from the standfirst. */
  dek?: string;
  topic: string;
  /** ISO date. Rendered through `formatDate`, never written out by hand. */
  date: string;
  readMinutes: number;
  /** The blunt one-liner in the red-bordered block. Jaiye's words. */
  myTake: string;
  body: Block[];
  status: PostStatus;
};

/** A chapter marker in an episode. `segment` tags the recurring bits. */
export type Chapter = { time: string; text: string; segment?: string };

export type Episode = {
  number: number;
  slug: string;
  title: string;
  titleAccent?: string;
  standfirst: string;
  date: string;
  /** Display runtime, e.g. "19:24". */
  runtime: string;
  guests: string;
  youtubeId: string;
  /** Set once an audio-only cut exists; the player renders it alongside. */
  audioUrl?: string;
  chapters: Chapter[];
  /** Links this episode to the vault entry recorded when it was taped. */
  vaultId?: string;
};

/**
 * Each pick resolves on its own, so June doesn't flip the whole board at once.
 * Colors live in `VAULT_STATUS_STYLE`.
 */
export type VaultStatus =
  | "in-vault"
  | "correct"
  | "almost"
  | "wrong"
  | "explain";

export type VaultPick = { call: string; tag: string; status: VaultStatus };

export type VaultEntry = {
  id: string;
  /** When Jaiye said it out loud. */
  saidOn: string;
  /** When the vault opens and the picks get graded. */
  opensOn: string;
  picks: VaultPick[];
};

export type GameStatus = "live" | "building" | "idea";

export type Game = {
  number: number;
  slug: string;
  title: string;
  titleAccent?: string;
  description: string;
  status: GameStatus;
  href?: string;
  screenshot?: string;
  credit?: string;
};

/** A label/value row on the Now page. The italic red noun is `accent`. */
export type NowRow = { label: string; value: string; accent?: string };

export type Book = { title: string; reaction: string; finishedOn: string };

export type NowSnapshot = {
  updatedAt: string;
  onCourt: NowRow[];
  offCourt: NowRow[];
  books: Book[];
  nextBook: string;
};

/**
 * The single source of truth for every "what's next" claim on the site.
 *
 * The homepage status strip, the /pod rail and the /now page all state the
 * same publishing facts. They read them from here so the site can't
 * contradict itself. Never restate these dates inline in a page.
 */
export type Schedule = {
  latestColumnSlug: string;
  nextColumnTopic: string;
  latestEpisodeSlug: string;
  /** What's being recorded right now. */
  inStudio: string;
  /** ISO date the next episode drops. */
  nextReleaseDate: string;
  /** What that next episode is. */
  nextRelease: string;
};
