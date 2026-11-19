/**
 * Pure rules for the reply picker: what gets flagged before the model sees it,
 * what a usable reply option looks like, and the Pacific clock. No I/O here, so
 * it's all covered by tests/instagram-rules.test.ts.
 */

export const MAX_REPLY_CHARS = 220;
export const MAX_DRAFTS_PER_RUN = 25;

/** Words that flag a comment or username outright. Matched as substrings, so only strong ones. */
const CRUDE = [
  "fuck", "shit", "bitch", "dick", "pussy", "cock", "porn", "sex", "nude", "nudes", "horny",
  "erectile", "cum", "whore", "slut", "nigg", "fag", "retard", "rape", "kys", "kill yourself",
];

/** Contact, location and grooming patterns. A kid's account never answers these. */
const CONTACT = [
  /\bdm\s*me\b/i, /\bmessage\s*me\b/i, /\btext\s*me\b/i, /\bcall\s*me\b/i, /\bsnap(chat)?\b/i,
  /\bkik\b/i, /\bwhats\s*app\b/i, /\btelegram\b/i, /\bdiscord\b/i,
  /\bwhere\s+do\s+(you|u)\s+(live|stay|go\s+to\s+school|play)\b/i, /\bwhat\s+school\b/i,
  /\bhow\s+old\s+(are|r)\s+(you|u)\b/i, /\baddress\b/i, /\bmeet\s+(up|me)\b/i, /\bphone\s*number\b/i,
  /\bsend\s+(me\s+)?(a\s+)?(pic|photo|picture)s?\b/i, /\bcute\b/i, /\bhandsome\b/i, /\bsexy\b/i,
];

const LINK = /(https?:\/\/|www\.|\.com\b|\.net\b|\.ly\b|link in bio|check my page|promo|giveaway|crypto|forex)/i;

export type PreFlag = { flagged: true; reason: string } | { flagged: false };

/** Hard checks that run before (and regardless of) the model. */
export function preFlag(username: string, text: string): PreFlag {
  const u = username.toLowerCase();
  const t = text.toLowerCase();
  if (CRUDE.some((w) => u.includes(w))) return { flagged: true, reason: "Crude username" };
  if (CRUDE.some((w) => t.includes(w))) return { flagged: true, reason: "Crude or hateful words" };
  for (const re of CONTACT) if (re.test(text)) return { flagged: true, reason: "Asks for contact, location or personal details" };
  if (LINK.test(text)) return { flagged: true, reason: "Link or spam" };
  return { flagged: false };
}

/** Counts emoji, treating a joined sequence (like a skin-tone emoji) as one. */
export function emojiCount(s: string): number {
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  let n = 0;
  for (const { segment } of seg.segment(s)) if (/\p{Extended_Pictographic}/u.test(segment)) n++;
  return n;
}

/**
 * Cleans one model-written option. Returns null when it breaks a rule we
 * can't fix: too long, more than one emoji, crude words, or contact asks.
 */
export function cleanOption(raw: string): string | null {
  let s = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
  s = s.replace(/\s*[—–]\s*/g, ", "); // no em or en dashes
  s = s.replace(/^@\S+\s*/, ""); // Instagram adds the @mention itself
  s = s.replace(/#\S+/g, "").replace(/\s{2,}/g, " ").trim(); // no hashtags
  if (!s || s.length > MAX_REPLY_CHARS) return null;
  if (emojiCount(s) > 1) return null;
  if (preFlag("", s).flagged) return null;
  return s;
}

/** Cleans what a parent typed. Only trims and caps; their words are their call. */
export function cleanCustom(raw: string): string | null {
  const s = raw.trim().replace(/^@\S+\s*/, "");
  if (!s || s.length > 500) return null;
  return s;
}

/** Date and hour in Los Angeles, for the 6am send and one batch per morning. */
export function pacificNow(d = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export const SEND_HOUR_PACIFIC = 6;
