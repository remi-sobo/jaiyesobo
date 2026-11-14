import { createServiceClient } from "@/lib/supabase/server";
import type { ApiEmail } from "@/lib/app-api/types";
import { sendEmail, type SendResult } from "./send";
import { canRepend, canSendConfirm, isValidEmail, maskEmail, normalizeEmail, relationFor, type Relation } from "./rules";
import { confirmEmail, parentConsentEmail, type Rendered } from "./templates";
import { sign, verifyForDb, versionMatches } from "./tokens";

/**
 * Subscribers: who gets email, and the confirm, preferences and unsubscribe
 * moves. Addresses never leave the server except to Resend. Anything shown to
 * a person is a masked hint.
 */

const db = () => createServiceClient();

export type SubStatus = "pending" | "confirmed" | "unsubscribed";

export type Subscriber = {
  id: string;
  email: string;
  player_id: string | null;
  relation: Relation;
  want_results: boolean;
  want_newsletter: boolean;
  status: SubStatus;
  source: string | null;
  updated_at: string;
};

const COLS = "id, email, player_id, relation, want_results, want_newsletter, status, source, updated_at";

export type SubscribeInput = {
  email: unknown;
  playerId?: string | null;
  /** The player's age band. `null` is an account from before the age question: treated as under 13, so a parent says yes. */
  ageBand?: string | null;
  /** The fan box's "I'm a parent signing up my kid". */
  under13?: boolean;
  source: string;
  wantResults: boolean;
  wantNewsletter: boolean;
};

export type SubscribeResult =
  | { ok: true; status: "check-your-inbox" | "parent-check" }
  | { ok: false; error: string };

/** Logs one send. The dedupe key is only kept on a real send, so a failure can be retried. */
export async function logEmail(row: {
  kind: "confirm" | "consent" | "results" | "newsletter";
  subscriberId: string | null;
  dedupeKey?: string | null;
  subject: string;
  result: SendResult;
}): Promise<void> {
  try {
    const sent = row.result.status === "sent";
    await db().from("sb_email_log").insert({
      kind: row.kind,
      subscriber_id: row.subscriberId,
      dedupe_key: sent ? (row.dedupeKey ?? null) : null,
      subject: row.subject,
      provider_id: row.result.status === "sent" ? row.result.id : null,
      status: row.result.status,
      error: row.result.status === "error" ? row.result.error : null,
    });
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.log", err: String(e) }));
  }
}

async function playerName(playerId: string | null | undefined): Promise<string | null> {
  if (!playerId) return null;
  const { data } = await db().from("sb_players").select("display_name").eq("id", playerId).maybeSingle();
  return (data?.display_name as string | undefined) ?? null;
}

/** The newest confirm or consent email actually sent to this subscriber, or null. */
async function lastConfirmSentAt(subscriberId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("sb_email_log")
    .select("created_at")
    .eq("subscriber_id", subscriberId)
    .in("kind", ["confirm", "consent"])
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.created_at as string | undefined) ?? null;
}

async function sendConfirmation(sub: Subscriber): Promise<SendResult> {
  // The link is tied to the row as it is now (its updated_at): any later change to the row retires it.
  const confirmToken = sign({ sid: sub.id, purpose: "confirm", v: Date.parse(sub.updated_at) });
  const manageToken = sign({ sid: sub.id, purpose: "manage" });
  const wants = { results: sub.want_results, newsletter: sub.want_newsletter };
  let mail: Rendered;
  if (sub.relation === "parent") {
    mail = parentConsentEmail({ confirmToken, manageToken, playerName: await playerName(sub.player_id), ...wants });
  } else {
    mail = confirmEmail({ confirmToken, manageToken, ...wants });
  }
  const result = await sendEmail({ to: sub.email, ...mail });
  await logEmail({ kind: sub.relation === "parent" ? "consent" : "confirm", subscriberId: sub.id, subject: mail.subject, result });
  return result;
}

/**
 * Adds or refreshes a subscriber and sends the confirm email (or the parent
 * consent email when the player is under 13). Nothing is ever sent to an
 * address until it is confirmed. Every case answers the same way, so the form
 * can't be used to find out who is subscribed, and:
 *
 * - A `confirmed` row is never touched from here, whatever is asked (a new
 *   want, under 13, another player). Someone who wants more changes it from
 *   the preferences page, through the manage link in every email.
 * - An `unsubscribed` row is only asked to re-confirm once it has been
 *   unsubscribed for 24 hours.
 * - A subscriber gets at most one confirm or consent email in 24 hours. Inside
 *   that window the row is left exactly as it is (changing it would retire the
 *   link in the email they already have).
 * - A signed in player's new address does not replace the old one yet: the old
 *   one stays active until the new one is confirmed (see `confirm`).
 */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "That email doesn't look right." };
  if (!input.wantResults && !input.wantNewsletter) return { ok: false, error: "Pick at least one thing to get." };

  const relation = relationFor({ ageBand: input.playerId ? (input.ageBand ?? null) : input.ageBand, under13: input.under13 });
  const reply: SubscribeResult = { ok: true, status: relation === "parent" ? "parent-check" : "check-your-inbox" };

  try {
    const { data: found } = await db().from("sb_subscribers").select(`${COLS}, unsubscribed_at`).eq("email", email).maybeSingle();
    const existing = (found as (Subscriber & { unsubscribed_at: string | null }) | null) ?? null;

    if (existing) {
      if (!canRepend(existing)) return reply;
      if (!canSendConfirm(await lastConfirmSentAt(existing.id))) return reply;
    }

    const fields = {
      relation,
      player_id: input.playerId ?? existing?.player_id ?? null,
      want_results: input.wantResults,
      want_newsletter: input.wantNewsletter,
      status: "pending" as const,
      source: input.source,
      confirmed_at: null,
      unsubscribed_at: null,
    };

    let sub: Subscriber | null = null;
    if (existing) {
      const { data, error } = await db().from("sb_subscribers").update(fields).eq("id", existing.id).select(COLS).single();
      if (error) throw error;
      sub = data as Subscriber;
    } else {
      const { data, error } = await db().from("sb_subscribers").insert({ email, ...fields }).select(COLS).single();
      if (error) {
        if (error.code !== "23505") throw error;
        // Lost a race with the same address: the other request owns the row and its confirm email.
        return reply;
      }
      sub = data as Subscriber;
    }
    await sendConfirmation(sub);
    return reply;
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.subscribe", err: String(e) }));
    return { ok: false, error: "Something went wrong. Try again in a bit." };
  }
}

/**
 * Read-only: what a confirm link is for, without confirming. The confirm page
 * shows a "Yes" button first, so an email scanner that opens the link can't
 * confirm an address (a parent's yes has to be a real tap).
 */
export async function confirmInfo(token: unknown): Promise<(Omit<Extract<ConfirmResult, { ok: true }>, "token"> & { status: SubStatus }) | { ok: false }> {
  const t = verifyForDb(token, "confirm");
  if (!t) return { ok: false };
  try {
    const { data } = await db().from("sb_subscribers").select(COLS).eq("id", t.sid).maybeSingle();
    const sub = data as Subscriber | null;
    if (!sub || sub.status === "unsubscribed" || !versionMatches(t.v, sub.updated_at)) return { ok: false };
    return {
      ok: true,
      status: sub.status,
      relation: sub.relation,
      playerName: sub.relation === "parent" ? await playerName(sub.player_id) : null,
      wantResults: sub.want_results,
      wantNewsletter: sub.want_newsletter,
    };
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.confirm", err: String(e) }));
    return { ok: false };
  }
}

/**
 * Catch-up: pending addresses from the last 7 days whose confirm (or parent
 * consent) email never went out, usually because they signed up before
 * RESEND_API_KEY was set. Sends each one once. Safe to run any number of
 * times; does nothing while the key is missing.
 */
export async function sendWaitingConfirmations(limit = 50, deadline?: number): Promise<{ sent: number; checked: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, checked: 0 };
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: pending } = await db().from("sb_subscribers").select(COLS).eq("status", "pending").gte("updated_at", since).limit(limit);
  const subs = (pending ?? []) as Subscriber[];
  if (!subs.length) return { sent: 0, checked: 0 };
  const { data: logs } = await db()
    .from("sb_email_log")
    .select("subscriber_id, created_at")
    .in("subscriber_id", subs.map((s) => s.id))
    .in("kind", ["confirm", "consent"])
    .eq("status", "sent");
  // A send only counts if it is newer than the row's last change: an older one carried a link that no longer works.
  const newest = new Map<string, number>();
  for (const l of logs ?? []) {
    const at = Date.parse(l.created_at as string);
    const id = l.subscriber_id as string;
    if (at > (newest.get(id) ?? 0)) newest.set(id, at);
  }
  let sent = 0;
  for (const sub of subs) {
    if (deadline !== undefined && Date.now() >= deadline) break;
    const last = newest.get(sub.id);
    if (last !== undefined && last > Date.parse(sub.updated_at)) continue;
    if (!canSendConfirm(last)) continue;
    try {
      const result = await sendConfirmation(sub);
      if (result.status === "sent") sent++;
      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      console.error(JSON.stringify({ scope: "email.catchup", sub: sub.id, err: String(e) }));
    }
  }
  console.log(JSON.stringify({ scope: "email.catchup", checked: subs.length, sent }));
  return { sent, checked: subs.length };
}

export type ConfirmResult =
  | { ok: true; relation: Relation; playerName: string | null; wantResults: boolean; wantNewsletter: boolean; token: string }
  | { ok: false };

/**
 * Confirms the address behind a confirm link. A link for an address that has
 * since unsubscribed, or whose row has changed since the link was sent, does
 * nothing. The result carries a fresh token for the row as it is now, so the
 * page can show the "you're in" state. When the address belongs to a player,
 * their previous address rows are deleted now that the new one is confirmed.
 */
export async function confirm(token: unknown): Promise<ConfirmResult> {
  const t = verifyForDb(token, "confirm");
  if (!t) return { ok: false };
  try {
    const { data } = await db().from("sb_subscribers").select(COLS).eq("id", t.sid).maybeSingle();
    let sub = data as Subscriber | null;
    if (!sub || sub.status === "unsubscribed" || !versionMatches(t.v, sub.updated_at)) return { ok: false };
    if (sub.status === "pending") {
      // Only if the row is still the one the link was sent for.
      const { data: done, error } = await db()
        .from("sb_subscribers")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", sub.id)
        .eq("status", "pending")
        .eq("updated_at", sub.updated_at)
        .select(COLS)
        .maybeSingle();
      if (error) throw error;
      if (!done) return { ok: false };
      sub = done as Subscriber;
      if (sub.player_id) {
        // The player's older address is let go: deleted, not detached (its send log goes with it).
        const { error: delErr } = await db().from("sb_subscribers").delete().eq("player_id", sub.player_id).neq("id", sub.id);
        if (delErr) console.error(JSON.stringify({ scope: "email.confirm", cleanup: sub.player_id, err: String(delErr.message ?? delErr) }));
      }
    }
    return {
      ok: true,
      relation: sub.relation,
      playerName: sub.relation === "parent" ? await playerName(sub.player_id) : null,
      wantResults: sub.want_results,
      wantNewsletter: sub.want_newsletter,
      token: sign({ sid: sub.id, purpose: "confirm", v: Date.parse(sub.updated_at) }),
    };
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.confirm", err: String(e) }));
    return { ok: false };
  }
}

export type Prefs = { results: boolean; newsletter: boolean };
export type PrefsView = Prefs & { hint: string; status: SubStatus; relation: Relation };

/** What the preferences page shows for a manage link, or null for a bad link. */
export async function prefsForToken(token: unknown): Promise<PrefsView | null> {
  const t = verifyForDb(token, "manage");
  if (!t) return null;
  const { data } = await db().from("sb_subscribers").select(COLS).eq("id", t.sid).maybeSingle();
  const sub = data as Subscriber | null;
  if (!sub) return null;
  return { results: sub.want_results, newsletter: sub.want_newsletter, hint: maskEmail(sub.email), status: sub.status, relation: sub.relation };
}

/** Saves the two toggles from a manage link. Turning both off is the same as unsubscribing. */
export async function updatePrefs(token: unknown, prefs: Prefs): Promise<PrefsView | null> {
  const t = verifyForDb(token, "manage");
  if (!t) return null;
  const both = prefs.results || prefs.newsletter;
  const { data: cur } = await db().from("sb_subscribers").select("status").eq("id", t.sid).maybeSingle();
  if (!cur) return null;
  const patch: Record<string, unknown> = { want_results: prefs.results, want_newsletter: prefs.newsletter };
  if (!both) {
    patch.status = "unsubscribed";
    patch.unsubscribed_at = new Date().toISOString();
  } else if (cur.status === "unsubscribed") {
    // They turned something back on from the preferences page. That isn't a new
    // confirmation, so it stays unsubscribed until they sign up again.
    delete patch.want_results;
    delete patch.want_newsletter;
  } else if (cur.status === "pending") {
    // Any change to a pending row retires the confirm link already in their inbox (it is tied to the row's updated_at),
    // so what a pending address will get stays as it was asked for until it is confirmed. Only unsubscribing is allowed.
    return prefsForToken(token);
  }
  const { error } = await db().from("sb_subscribers").update(patch).eq("id", t.sid);
  if (error) throw error;
  return prefsForToken(token);
}

/** One click unsubscribe from everything. Returns false for a bad link. */
export async function unsubscribe(token: unknown): Promise<boolean> {
  const t = verifyForDb(token, "manage");
  if (!t) return false;
  const { data, error } = await db()
    .from("sb_subscribers")
    .update({ status: "unsubscribed", want_results: false, want_newsletter: false, unsubscribed_at: new Date().toISOString() })
    .eq("id", t.sid)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** The newest subscriber row for a player, if any. */
export async function subscriberForPlayer(playerId: string): Promise<Subscriber | null> {
  const { data } = await db()
    .from("sb_subscribers")
    .select(COLS)
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Subscriber | null) ?? null;
}

/** The app's view of a player's email: a masked hint, never the address. */
export async function apiEmailFor(playerId: string): Promise<ApiEmail | null> {
  try {
    const sub = await subscriberForPlayer(playerId);
    if (!sub) return null;
    return {
      address_hint: maskEmail(sub.email),
      status: sub.status,
      relation: sub.relation,
      want_results: sub.want_results,
      want_newsletter: sub.want_newsletter,
    };
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.api", err: String(e) }));
    return null;
  }
}

/** Preferences from inside the app, where the player is already signed in. Null when they have no email on file. */
export async function updatePrefsForPlayer(playerId: string, prefs: Prefs): Promise<boolean> {
  const sub = await subscriberForPlayer(playerId);
  if (!sub || sub.status === "unsubscribed") return false;
  const off = !prefs.results && !prefs.newsletter;
  // A pending row is left alone unless it is being turned off: changing it would retire its confirm link.
  if (sub.status === "pending" && !off) return true;
  const { error } = await db()
    .from("sb_subscribers")
    .update({
      want_results: prefs.results,
      want_newsletter: prefs.newsletter,
      ...(off ? { status: "unsubscribed", unsubscribed_at: new Date().toISOString() } : {}),
    })
    .eq("id", sub.id);
  if (error) throw error;
  return true;
}

export type SubscriberStats = { confirmed: number; pending: number; unsubscribed: number; results: number; newsletter: number };

/** Counts for the admin page. Confirmed and wanting each kind. */
export async function subscriberStats(): Promise<SubscriberStats> {
  const head = () => db().from("sb_subscribers").select("id", { count: "exact", head: true });
  const [confirmed, pending, unsubscribed, results, newsletter] = await Promise.all([
    head().eq("status", "confirmed"),
    head().eq("status", "pending"),
    head().eq("status", "unsubscribed"),
    head().eq("status", "confirmed").eq("want_results", true),
    head().eq("status", "confirmed").eq("want_newsletter", true),
  ]);
  return {
    confirmed: confirmed.count ?? 0,
    pending: pending.count ?? 0,
    unsubscribed: unsubscribed.count ?? 0,
    results: results.count ?? 0,
    newsletter: newsletter.count ?? 0,
  };
}
