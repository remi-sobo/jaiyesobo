/**
 * Pure helpers for email: no database, no network, so they are easy to test.
 */

export const SITE_URL = "https://www.jaiyesobo.com";

/** Lowercased and trimmed. Addresses are stored this way and are unique. */
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** A sane address: one @, a dotted domain, no spaces, at most 254 characters. */
export function isValidEmail(raw: unknown): boolean {
  const e = normalizeEmail(raw);
  if (e.length < 6 || e.length > 254) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(e) && !e.includes("..");
}

export type Relation = "self" | "parent";

/**
 * Under 13 means a parent has to say yes first. The player's own age band
 * wins when we have one; the fan box passes `under13` when a parent is
 * signing up a kid. A player whose age we never asked (`ageBand: null`, an old
 * account) gets the parent check too, to be safe. No age at all (`undefined`,
 * the fan box with no tick) means a grown up signing up for themselves.
 */
export function relationFor(opts: { ageBand?: string | null; under13?: boolean }): Relation {
  if (opts.ageBand === "under_13" || opts.ageBand === null || opts.under13 === true) return "parent";
  return "self";
}

/** "r***@gmail.com". Keeps the first letter and the domain, nothing else. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export function ordinal(n: number): string {
  const v = Math.abs(Math.trunc(n));
  const last2 = v % 100;
  if (last2 >= 11 && last2 <= 13) return `${n}th`;
  switch (v % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** The first `count` sentences of a block of text, on one line. */
export function firstSentences(text: string | null | undefined, count = 2): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  const parts = flat.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g) ?? [flat];
  return parts.slice(0, count).map((s) => s.trim()).join(" ").trim();
}

/* Confirm / consent mail limits and claim rules (pure, so they are easy to test). */

const HOUR_MS = 60 * 60 * 1000;
/** One confirm or consent email per subscriber per 24 hours. */
export const CONFIRM_COOLDOWN_MS = 24 * HOUR_MS;
/** An unsubscribed address can be asked to re-confirm only after this long. */
export const RESUBSCRIBE_AFTER_MS = 24 * HOUR_MS;
/** A send claim that is still in its pre-send state after this long is dead (the run that took it died). */
export const STALE_CLAIM_MS = 10 * 60 * 1000;
/** The subject a claim row carries until the send finishes. With status `skipped` it marks a claim still in its pre-send state. */
export const CLAIM_SUBJECT = "(sending)";
/** All the email sending one cron invocation may do, in total. Keeps a run well inside its time limit. */
export const EMAIL_RUN_BUDGET_MS = 135_000;

const toMs = (v: Date | string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const ms = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

/** True when no confirm or consent email went to this subscriber in the last 24 hours. `lastSentAt` is the newest one, if any. */
export function canSendConfirm(lastSentAt: Date | string | number | null | undefined, now: number = Date.now()): boolean {
  const last = toMs(lastSentAt);
  return last === null || now - last >= CONFIRM_COOLDOWN_MS;
}

/**
 * Whether `subscribe` may put an existing row back to `pending`. A pending
 * row can be refreshed. A confirmed row is never touched. An unsubscribed row
 * only once its `unsubscribed_at` is more than 24 hours old (a missing date
 * counts as old).
 */
export function canRepend(row: { status: string; unsubscribed_at?: Date | string | number | null }, now: number = Date.now()): boolean {
  if (row.status === "pending") return true;
  if (row.status !== "unsubscribed") return false;
  const at = toMs(row.unsubscribed_at);
  return at === null || now - at >= RESUBSCRIBE_AFTER_MS;
}

/** A claim row that never got past its pre-send state and is older than 10 minutes. */
export function isStaleClaim(row: { status: string; subject: string | null; created_at: Date | string | number }, now: number = Date.now()): boolean {
  if (row.status !== "skipped" || row.subject !== CLAIM_SUBJECT) return false;
  const at = toMs(row.created_at);
  return at !== null && now - at > STALE_CLAIM_MS;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A subscriber id is a uuid. Anything else (the test newsletter's "test") is never sent to the database. */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}
