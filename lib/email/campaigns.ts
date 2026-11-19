import { createServiceClient } from "@/lib/supabase/server";
import { episodes, getEpisode } from "@/lib/content/episodes";
import { getPost, publishedPosts } from "@/lib/content/posts";
import { getWeek } from "@/lib/sportsbook/data";
import { weekResultRow } from "@/lib/sportsbook/view";
import { SB_SEASON } from "@/lib/sportsbook/weeks";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { emailEnabled, sendEmail } from "./send";
import { CLAIM_SUBJECT, SITE_URL, STALE_CLAIM_MS, isStaleClaim } from "./rules";
import { logEmail } from "./subscribers";
import { newsletterEmail, resultsEmail, type Rendered } from "./templates";
import { sign } from "./tokens";

/**
 * Bulk sends: Monday results and newsletters. Both are idempotent per
 * subscriber through sb_email_log's (subscriber_id, dedupe_key) index, so a
 * rerun or an overlapping run sends nothing twice. Sends go one at a time with
 * a short gap (Resend's free tier allows about 2 requests a second).
 */

const db = () => createServiceClient();

/** Gap between sends. About 1.6 a second. */
const GAP_MS = 600;
/** Stop a batch after this long; the next run picks up where it left off. */
const BUDGET_MS = 150_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type BatchResult = { sent: number; skipped: number; errors: number; already: number; off?: boolean; unfinished?: boolean };

type Row = { id: string; email: string; player_id: string | null };

async function audience(column: "want_results" | "want_newsletter"): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db()
      .from("sb_subscribers")
      .select("id, email, player_id")
      .eq("status", "confirmed")
      .eq(column, true)
      .order("created_at")
      .range(from, from + 499);
    if (error) throw error;
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 500) break;
  }
  return out;
}

/**
 * A claim row is written as status `skipped` with the subject "(sending)" and
 * becomes `sent` only when the send finishes. One still in that state after 10
 * minutes belongs to a run that died, so it is deleted and the send retried.
 */
async function clearStaleClaims(dedupeKey: string): Promise<void> {
  const { error } = await db()
    .from("sb_email_log")
    .delete()
    .eq("dedupe_key", dedupeKey)
    .eq("status", "skipped")
    .eq("subject", CLAIM_SUBJECT)
    .lt("created_at", new Date(Date.now() - STALE_CLAIM_MS).toISOString());
  if (error) throw error;
}

async function alreadySent(dedupeKey: string): Promise<Set<string>> {
  const done = new Set<string>();
  const now = Date.now();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("sb_email_log")
      .select("subscriber_id, status, subject, created_at")
      .eq("dedupe_key", dedupeKey)
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) {
      if (isStaleClaim({ status: r.status as string, subject: r.subject as string | null, created_at: r.created_at as string }, now)) continue;
      if (r.subscriber_id) done.add(r.subscriber_id as string);
    }
    if (!data || data.length < 1000) break;
  }
  return done;
}

/**
 * Sends one email to one subscriber exactly once. A claim row with the dedupe
 * key goes in first: if another run already holds it, this one sends nothing.
 * A failed or skipped send gives the claim back so the next run can retry.
 */
async function sendOnce(
  kind: "results" | "newsletter",
  sub: Row,
  dedupeKey: string,
  render: () => Promise<Rendered> | Rendered,
): Promise<"sent" | "skipped" | "error" | "already"> {
  const { data: claim, error: claimErr } = await db()
    .from("sb_email_log")
    .insert({ kind, subscriber_id: sub.id, dedupe_key: dedupeKey, subject: CLAIM_SUBJECT, status: "skipped" })
    .select("id")
    .single();
  if (claimErr) return claimErr.code === "23505" ? "already" : "error";
  const claimId = claim.id as string;
  const release = async () => {
    await db().from("sb_email_log").delete().eq("id", claimId);
  };
  try {
    // They may have opted out (or turned this kind off) since the audience was read, maybe a moment ago.
    const { data: now, error: nowErr } = await db().from("sb_subscribers").select("status, want_results, want_newsletter").eq("id", sub.id).maybeSingle();
    if (nowErr) throw nowErr;
    const wants = kind === "results" ? now?.want_results : now?.want_newsletter;
    if (!now || now.status !== "confirmed" || wants !== true) {
      await release();
      return "skipped";
    }
    const mail = await render();
    const result = await sendEmail({ to: sub.email, ...mail });
    if (result.status === "sent") {
      await db().from("sb_email_log").update({ status: "sent", subject: mail.subject, provider_id: result.id }).eq("id", claimId);
      return "sent";
    }
    await db().from("sb_email_log").delete().eq("id", claimId);
    await logEmail({ kind, subscriberId: sub.id, subject: mail.subject, result });
    return result.status;
  } catch (e) {
    await db().from("sb_email_log").delete().eq("id", claimId);
    await logEmail({ kind, subscriberId: sub.id, subject: "(render failed)", result: { status: "error", error: String(e) } });
    return "error";
  }
}

async function runBatch(
  kind: "results" | "newsletter",
  rows: Row[],
  dedupeKey: string,
  render: (sub: Row) => Promise<Rendered> | Rendered,
  budgetMs = BUDGET_MS,
): Promise<BatchResult> {
  const out: BatchResult = { sent: 0, skipped: 0, errors: 0, already: 0 };
  await clearStaleClaims(dedupeKey);
  const done = await alreadySent(dedupeKey);
  const started = Date.now();
  let first = true;
  for (const sub of rows) {
    if (done.has(sub.id)) {
      out.already++;
      continue;
    }
    if (Date.now() - started > budgetMs) {
      out.unfinished = true;
      break;
    }
    if (!first) await sleep(GAP_MS);
    first = false;
    const r = await sendOnce(kind, sub, dedupeKey, () => render(sub));
    if (r === "sent") out.sent++;
    else if (r === "skipped") out.skipped++;
    else if (r === "already") out.already++;
    else out.errors++;
  }
  return out;
}

const manageToken = (sid: string) => sign({ sid, purpose: "manage" });

/**
 * Monday results for a published week. Personal for subscribers whose player
 * played that week, the general version for everyone else. Never throws.
 */
export async function sendResultsEmails(n: number, opts: { budgetMs?: number } = {}): Promise<BatchResult> {
  const empty: BatchResult = { sent: 0, skipped: 0, errors: 0, already: 0 };
  try {
    if (!emailEnabled()) {
      console.log(JSON.stringify({ scope: "email.results", week: n, skipped: "no-key" }));
      return { ...empty, off: true };
    }
    const week = await getWeek(n);
    if (!week || (week.status !== "final" && week.status !== "graded")) return empty;
    const general = await weekResultRow(n, null);
    if (!general) return empty;
    const rows = await audience("want_results");
    const result = await runBatch("results", rows, `results:${SB_SEASON}:${n}`, async (sub) => {
      const personal = sub.player_id ? await weekResultRow(n, sub.player_id).catch(() => null) : null;
      const row = personal?.me ? personal : general;
      return resultsEmail({ season: SB_SEASON, row, recap: week.recap, manageToken: manageToken(sub.id) });
    }, opts.budgetMs);
    console.log(JSON.stringify({ scope: "email.results", week: n, ...result }));
    return result;
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.results", week: n, err: String(e) }));
    return { ...empty, errors: 1 };
  }
}

/* Newsletter */

export type NewsletterKind = "episode" | "column";

export type NewsletterContent = { kind: NewsletterKind; slug: string; title: string; standfirst: string; url: string; date: string };

/** What a newsletter about this episode or column says, from the content lists. Null for a slug that doesn't exist. */
export function newsletterContent(kind: NewsletterKind, slug: string): NewsletterContent | null {
  if (kind === "episode") {
    const e = getEpisode(slug);
    return e ? { kind, slug, title: e.title, standfirst: e.standfirst, url: `${SITE_URL}/pod/${e.slug}`, date: e.date } : null;
  }
  const p = getPost(slug);
  return p && p.status === "published" ? { kind, slug, title: p.title, standfirst: p.standfirst, url: `${SITE_URL}/column/${p.slug}`, date: p.date } : null;
}

/** The newest episode and column, for the admin to pick from. */
export function newsletterChoices(): NewsletterContent[] {
  const list: NewsletterContent[] = [];
  for (const e of episodes.slice(0, 5)) {
    const c = newsletterContent("episode", e.slug);
    if (c) list.push(c);
  }
  for (const p of publishedPosts().slice(0, 5)) {
    const c = newsletterContent("column", p.slug);
    if (c) list.push(c);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export const newsletterKey = (kind: NewsletterKind, slug: string) => `newsletter:${kind}:${slug}`;

function renderNewsletter(c: NewsletterContent, token: string, note?: string): Rendered {
  return newsletterEmail({ kind: c.kind, title: c.title, standfirst: c.standfirst, url: c.url, note: note?.trim() || undefined, manageToken: token });
}

/** What the admin sees before sending: the real subject and body, with a placeholder unsubscribe token. */
export function previewNewsletter(kind: NewsletterKind, slug: string, note?: string): Rendered | null {
  const c = newsletterContent(kind, slug);
  return c ? renderNewsletter(c, "preview", note) : null;
}

/** How many subscribers already got this one. */
export async function newsletterSentCount(kind: NewsletterKind, slug: string): Promise<number> {
  const { count } = await db().from("sb_email_log").select("id", { count: "exact", head: true }).eq("dedupe_key", newsletterKey(kind, slug));
  return count ?? 0;
}

/** Sends a newsletter to every confirmed subscriber who wants it and hasn't had this one. Never throws. */
export async function sendNewsletter(opts: { kind: NewsletterKind; slug: string; note?: string; budgetMs?: number }): Promise<BatchResult> {
  const empty: BatchResult = { sent: 0, skipped: 0, errors: 0, already: 0 };
  try {
    const c = newsletterContent(opts.kind, opts.slug);
    if (!c) return { ...empty, errors: 1 };
    if (!emailEnabled()) return { ...empty, off: true };
    const rows = await audience("want_newsletter");
    const result = await runBatch("newsletter", rows, newsletterKey(opts.kind, opts.slug), (sub) => renderNewsletter(c, manageToken(sub.id), opts.note), opts.budgetMs);
    console.log(JSON.stringify({ scope: "email.newsletter", kind: opts.kind, slug: opts.slug, ...result }));
    return result;
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.newsletter", err: String(e) }));
    return { ...empty, errors: 1 };
  }
}

/** One copy to Remi, with no dedupe log, so it can be sent as often as needed. */
export async function sendNewsletterTest(opts: { kind: NewsletterKind; slug: string; to?: string; note?: string }) {
  const c = newsletterContent(opts.kind, opts.slug);
  if (!c) return { status: "error" as const, error: "No such episode or column." };
  const mail = renderNewsletter(c, sign({ sid: "test", purpose: "manage" }), opts.note);
  return sendEmail({ to: opts.to ?? CONTACT_EMAIL, ...mail, subject: `[Test] ${mail.subject}` });
}
