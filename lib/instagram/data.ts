import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { IgRejected, getToken, hideComment, listComments, listRecentMedia, replyToComment, tokenDaysLeft } from "./api";
import { draftReplies } from "./draft";
import { morningEmail, reconnectEmail } from "./email";
import { CARRY_OVER_DAYS, MAX_DRAFTS_PER_RUN, SEND_HOUR_PACIFIC, STALE_CLAIM_MS, cleanCustom, pacificNow } from "./rules";
import { createPickerToken } from "./tokens";

export type CommentStatus = "open" | "flagged" | "posting" | "unknown" | "posted" | "skipped" | "hidden" | "left";

export type CommentRow = {
  id: string;
  media_id: string;
  media_permalink: string | null;
  media_thumb: string | null;
  media_caption: string | null;
  username: string;
  text: string;
  commented_at: string;
  status: CommentStatus;
  flag_reason: string | null;
  options: string[];
  chosen_index: number | null;
  custom_text: string | null;
  posted_text: string | null;
  reply_id: string | null;
  error: string | null;
  claimed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  batch_id: string | null;
};

/** Statuses still waiting on a parent. "unknown" means Instagram may already have the reply. */
export const WAITING: CommentStatus[] = ["open", "flagged", "posting", "unknown"];

const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ scope: "instagram", ...o }));

/* The 6am job */

export type MorningResult =
  | { status: "skipped"; reason: string }
  | { status: "done"; newComments: number; inBatch: number; emailed: boolean }
  | { status: "error"; error: string };

async function alert(error: string) {
  log({ step: "alert", error });
  await sendEmail({ to: process.env.IG_ALERT_EMAIL ?? CONTACT_EMAIL, ...reconnectEmail(error) });
}

/** Today's live batch, made if missing. A killed batch is replaced, not reused. */
async function liveBatch(date: string): Promise<{ id: string; emailed_at: string | null }> {
  const supa = createServiceClient();
  const find = () => supa.from("ig_batches").select("id, emailed_at").eq("pacific_date", date).is("revoked_at", null).maybeSingle();
  let { data } = await find();
  if (!data) {
    await supa.from("ig_batches").insert({ pacific_date: date }); // a racing insert loses on the unique index; fine
    ({ data } = await find());
  }
  if (!data) throw new Error("Could not make today's batch");
  return data;
}

export async function morningRun(opts: { force?: boolean; now?: Date } = {}): Promise<MorningResult> {
  const { date, hour } = pacificNow(opts.now);
  if (!opts.force && hour !== SEND_HOUR_PACIFIC) return { status: "skipped", reason: `It's ${hour}:00 in LA, not ${SEND_HOUR_PACIFIC}:00` };
  try {
    return await run(date, !!opts.force);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await alert(`The 6am run failed: ${error}`);
    return { status: "error", error };
  }
}

async function run(date: string, force: boolean): Promise<MorningResult> {
  const supa = createServiceClient();
  const batch = await liveBatch(date);
  if (batch.emailed_at && !force) return { status: "skipped", reason: "Already sent this morning" };

  let token: string, ourUsername: string, igUserId: string;
  try {
    ({ token, username: ourUsername, igUserId } = await getToken());
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await alert(error);
    return { status: "error", error };
  }
  const days = await tokenDaysLeft();
  if (days !== null && days < 5) await alert(`The Instagram token runs out in ${Math.max(0, Math.floor(days))} days and didn't renew.`);

  // Everything new on the last 12 posts that we haven't seen or answered.
  const media = await listRecentMedia(token, igUserId, 12);
  const found: { media: (typeof media)[number]; c: Awaited<ReturnType<typeof listComments>>[number] }[] = [];
  let failures = 0;
  for (const m of media) {
    try {
      for (const c of await listComments(token, m.id)) found.push({ media: m, c });
    } catch (e) {
      failures++;
      log({ step: "comments", media: m.id, error: String(e) });
    }
  }
  if (media.length && failures === media.length) throw new Error("Couldn't read comments on any post (permissions?)");

  const me = ourUsername.toLowerCase();
  const fresh = found.filter(
    ({ c }) => c.username.toLowerCase() !== me && !c.replies.some((r) => r.username.toLowerCase() === me),
  );
  const ids = fresh.map(({ c }) => c.id);
  const { data: seen } = ids.length ? await supa.from("ig_comments").select("id").in("id", ids) : { data: [] };
  const seenIds = new Set((seen ?? []).map((r) => r.id));
  const todo = fresh
    .filter(({ c }) => !seenIds.has(c.id))
    .sort((a, b) => b.c.timestamp.localeCompare(a.c.timestamp))
    .slice(0, MAX_DRAFTS_PER_RUN);

  if (todo.length) {
    const drafts = await draftReplies(
      todo.map(({ c, media: m }) => ({ id: c.id, username: c.username, text: c.text, caption: m.caption ?? null })),
    );
    const byId = new Map(drafts.map((d) => [d.id, d]));
    const rows = todo.map(({ c, media: m }) => {
      const d = byId.get(c.id);
      const flagged = !d || d.flagged || d.options.length === 0;
      return {
        id: c.id,
        media_id: m.id,
        media_permalink: m.permalink ?? null,
        media_thumb: m.thumbnail_url ?? m.media_url ?? null,
        media_caption: m.caption ?? null,
        username: c.username,
        text: c.text,
        commented_at: c.timestamp,
        status: flagged ? "flagged" : "open",
        flag_reason: flagged ? (d?.reason ?? "No usable options came back; take a look") : null,
        options: d?.options ?? [],
        batch_id: batch.id,
      };
    });
    const { error } = await supa.from("ig_comments").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`insert: ${error.message}`);
  }

  // Comments still waiting from the last week roll into today's link. Older ones drop out of the email.
  const since = new Date(Date.now() - CARRY_OVER_DAYS * 864e5).toISOString();
  await supa
    .from("ig_comments")
    .update({ batch_id: batch.id })
    .in("status", ["open", "flagged", "unknown"])
    .gte("commented_at", since)
    .neq("batch_id", batch.id);

  const { data: pending } = await supa
    .from("ig_comments")
    .select("username, text, status")
    .eq("batch_id", batch.id)
    .in("status", ["open", "flagged", "unknown"])
    .order("commented_at", { ascending: false });
  const list = pending ?? [];
  log({ step: "drafted", new: todo.length, pending: list.length });

  const to = process.env.KENDRA_REPLY_EMAIL;
  if (!list.length || !to) return { status: "done", newComments: todo.length, inBatch: list.length, emailed: false };

  // Claim the send so two overlapping runs can't both email. A forced run reclaims.
  let claim = supa.from("ig_batches").update({ emailed_at: new Date().toISOString(), comment_count: list.length }).eq("id", batch.id);
  if (!force) claim = claim.is("emailed_at", null);
  const { data: claimed } = await claim.select("id").maybeSingle();
  if (!claimed) return { status: "skipped", reason: "Another run is sending this morning's email" };

  const mail = morningEmail(
    createPickerToken(batch.id),
    list.map((r) => ({ username: r.username, text: r.text, flagged: r.status !== "open" })),
  );
  const sent = await sendEmail({ to, ...mail });
  if (sent.status !== "sent") {
    await supa.from("ig_batches").update({ emailed_at: null }).eq("id", batch.id);
    throw new Error(`Email to Kendra didn't send: ${sent.status === "error" ? sent.error : sent.reason}`);
  }
  return { status: "done", newComments: todo.length, inBatch: list.length, emailed: true };
}

/* The picker */

export type Viewer = { kind: "admin" } | { kind: "link"; batchId: string };

export async function batchIsLive(batchId: string): Promise<boolean> {
  const supa = createServiceClient();
  const { data } = await supa.from("ig_batches").select("revoked_at").eq("id", batchId).maybeSingle();
  return !!data && !data.revoked_at;
}

/** A post claim that never finished (the function died) becomes "unknown" for a parent to check. */
async function settleStaleClaims() {
  const supa = createServiceClient();
  await supa
    .from("ig_comments")
    .update({ status: "unknown", error: "The post didn't finish. Check the post on Instagram." })
    .eq("status", "posting")
    .lt("claimed_at", new Date(Date.now() - STALE_CLAIM_MS).toISOString());
}

export async function listForViewer(v: Viewer): Promise<{ pending: CommentRow[]; done: CommentRow[] }> {
  await settleStaleClaims();
  const supa = createServiceClient();
  let q = supa.from("ig_comments").select("*").order("commented_at", { ascending: false }).limit(100);
  if (v.kind === "link") q = q.eq("batch_id", v.batchId);
  else q = q.or(`status.in.(${WAITING.join(",")}),decided_at.gte.${new Date(Date.now() - 3 * 864e5).toISOString()}`);
  const { data } = await q;
  const rows = (data ?? []) as CommentRow[];
  return {
    pending: rows.filter((r) => WAITING.includes(r.status)),
    done: rows.filter((r) => !WAITING.includes(r.status)),
  };
}

export async function openCount(): Promise<number> {
  try {
    const supa = createServiceClient();
    const { count } = await supa.from("ig_comments").select("id", { count: "exact", head: true }).in("status", ["open", "flagged", "unknown"]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Checked at runtime: server actions can be called with anything. */
export const DecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), choice: z.number().int().min(0).max(2) }),
  z.object({ action: z.literal("custom"), text: z.string().max(2000) }),
  z.object({ action: z.literal("skip") }),
  z.object({ action: z.literal("hide") }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("posted") }), // "unknown" turned out to be on Instagram
  z.object({ action: z.literal("retry") }), // "unknown" turned out not to be on Instagram
]);
export type Decision = z.infer<typeof DecisionSchema>;

export type DecideResult = { ok: true; row: CommentRow } | { ok: false; error: string };

const TRY_AGAIN = "Instagram didn't take that. Try again in a minute.";

/** Moves a row from one of `from` to `to` in one update, so only one tap wins. */
async function move(commentId: string, from: CommentStatus[], patch: Record<string, unknown>): Promise<CommentRow | null> {
  const supa = createServiceClient();
  const { data } = await supa.from("ig_comments").update(patch).eq("id", commentId).in("status", from).select("*").maybeSingle();
  return (data as CommentRow | null) ?? null;
}

export async function decide(v: Viewer, commentId: string, input: unknown): Promise<DecideResult> {
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success || typeof commentId !== "string") return { ok: false, error: "That didn't work. Reload and try again." };
  const d = parsed.data;

  const supa = createServiceClient();
  const actor = v.kind === "admin" ? "admin" : "kendra";
  const { data: row } = await supa.from("ig_comments").select("*").eq("id", commentId).maybeSingle();
  if (!row) return { ok: false, error: "That comment isn't here anymore." };
  if (v.kind === "link") {
    if (row.batch_id !== v.batchId || !(await batchIsLive(v.batchId))) return { ok: false, error: "This link expired." };
  }
  const now = new Date().toISOString();
  const decided = { decided_by: actor, decided_at: now };

  switch (d.action) {
    case "skip": {
      const r = await move(commentId, ["open"], { status: "skipped", ...decided });
      return r ? { ok: true, row: r } : { ok: false, error: "Already handled." };
    }
    case "leave": {
      const r = await move(commentId, ["flagged"], { status: "left", ...decided });
      return r ? { ok: true, row: r } : { ok: false, error: "Already handled." };
    }
    case "posted": {
      const r = await move(commentId, ["unknown"], { status: "posted", error: null, ...decided });
      return r ? { ok: true, row: r } : { ok: false, error: "Already handled." };
    }
    case "retry": {
      const back = (row.options ?? []).length ? "open" : "flagged";
      const r = await move(commentId, ["unknown"], { status: back, error: null, claimed_at: null });
      return r ? { ok: true, row: r } : { ok: false, error: "Already handled." };
    }
    case "hide": {
      const prev = row.status as CommentStatus;
      if (!(await move(commentId, ["open", "flagged"], { status: "posting", claimed_at: now }))) return { ok: false, error: "Already handled." };
      try {
        const { token } = await getToken();
        await hideComment(token, commentId);
      } catch (e) {
        // Hiding twice is harmless, so any failure just goes back to where it was.
        await supa.from("ig_comments").update({ status: prev, error: String(e), claimed_at: null }).eq("id", commentId);
        return { ok: false, error: TRY_AGAIN };
      }
      const r = await move(commentId, ["posting"], { status: "hidden", error: null, ...decided });
      return r ? { ok: true, row: r } : { ok: false, error: "Hidden, but the page didn't update. Reload." };
    }
    case "post":
    case "custom": {
      const text = d.action === "post" ? ((row.options ?? []) as string[])[d.choice] ?? null : cleanCustom(d.text);
      if (!text) return { ok: false, error: d.action === "post" ? "That option isn't there." : "Type a reply first (500 characters max)." };
      const prev = row.status as CommentStatus;
      const from: CommentStatus[] = d.action === "custom" ? ["open", "flagged"] : ["open"];
      if (!(await move(commentId, from, { status: "posting", claimed_at: now }))) return { ok: false, error: "Already handled." };

      let replyId: string;
      try {
        const { token } = await getToken();
        replyId = await replyToComment(token, commentId, text);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        log({ step: "post-failed", comment: commentId, error, rejected: e instanceof IgRejected });
        if (e instanceof IgRejected || (e instanceof Error && /not connected|token expired/.test(e.message))) {
          // Instagram said no, so nothing posted: safe to try again.
          await supa.from("ig_comments").update({ status: prev, error, claimed_at: null }).eq("id", commentId);
          return { ok: false, error: TRY_AGAIN };
        }
        // Timeout or lost answer: it may have posted. Never retry on our own.
        const r = await move(commentId, ["posting"], { status: "unknown", error, posted_text: text });
        return r
          ? { ok: true, row: r }
          : { ok: false, error: "Instagram didn't answer. Check the post before trying again." };
      }

      const patch = {
        status: "posted",
        posted_text: text,
        chosen_index: d.action === "post" ? d.choice : null,
        custom_text: d.action === "custom" ? text : null,
        reply_id: replyId,
        error: null,
        ...decided,
      };
      const r = await move(commentId, ["posting", "unknown"], patch);
      log({ step: "posted", comment: commentId, by: actor });
      if (r) return { ok: true, row: r };
      // The reply is live; make sure the row says so even if the claim moved.
      await supa.from("ig_comments").update(patch).eq("id", commentId);
      return { ok: false, error: "Posted. Reload to see it." };
    }
  }
}

export async function revokeAllLinks(): Promise<void> {
  const supa = createServiceClient();
  await supa.from("ig_batches").update({ revoked_at: new Date().toISOString() }).is("revoked_at", null);
}
