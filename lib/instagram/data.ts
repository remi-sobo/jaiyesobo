import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { getToken, hideComment, listComments, listRecentMedia, replyToComment } from "./api";
import { draftReplies } from "./draft";
import { morningEmail, reconnectEmail } from "./email";
import { MAX_DRAFTS_PER_RUN, SEND_HOUR_PACIFIC, cleanCustom, pacificNow } from "./rules";
import { createPickerToken } from "./tokens";

export type CommentRow = {
  id: string;
  media_id: string;
  media_permalink: string | null;
  media_thumb: string | null;
  media_caption: string | null;
  username: string;
  text: string;
  commented_at: string;
  status: "open" | "flagged" | "posting" | "posted" | "skipped" | "hidden" | "left";
  flag_reason: string | null;
  options: string[];
  chosen_index: number | null;
  custom_text: string | null;
  posted_text: string | null;
  reply_id: string | null;
  error: string | null;
  decided_by: string | null;
  decided_at: string | null;
  batch_id: string | null;
};

const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ scope: "instagram", ...o }));

/* The 6am job */

export type MorningResult =
  | { status: "skipped"; reason: string }
  | { status: "done"; newComments: number; inBatch: number; emailed: boolean }
  | { status: "error"; error: string };

export async function morningRun(opts: { force?: boolean; now?: Date } = {}): Promise<MorningResult> {
  const { date, hour } = pacificNow(opts.now);
  if (!opts.force && hour !== SEND_HOUR_PACIFIC) return { status: "skipped", reason: `It's ${hour}:00 in LA, not ${SEND_HOUR_PACIFIC}:00` };

  const supa = createServiceClient();
  await supa.from("ig_batches").upsert({ pacific_date: date }, { onConflict: "pacific_date", ignoreDuplicates: true });
  const { data: batch, error: bErr } = await supa.from("ig_batches").select("*").eq("pacific_date", date).single();
  if (bErr || !batch) return { status: "error", error: `batch: ${bErr?.message ?? "missing"}` };
  if (batch.emailed_at && !opts.force) return { status: "skipped", reason: "Already sent this morning" };

  let token: string, ourUsername: string;
  try {
    ({ token, username: ourUsername } = await getToken());
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    log({ step: "token", error });
    const r = reconnectEmail(error);
    await sendEmail({ to: process.env.IG_ALERT_EMAIL ?? CONTACT_EMAIL, ...r });
    return { status: "error", error };
  }

  // Everything new on the last 12 posts that we haven't seen or answered.
  const media = await listRecentMedia(token, 12);
  const found: { media: (typeof media)[number]; c: Awaited<ReturnType<typeof listComments>>[number] }[] = [];
  for (const m of media) {
    try {
      for (const c of await listComments(token, m.id)) found.push({ media: m, c });
    } catch (e) {
      log({ step: "comments", media: m.id, error: String(e) });
    }
  }
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
    if (error) return { status: "error", error: `insert: ${error.message}` };
  }

  // Anything still waiting from earlier mornings rolls into today's link.
  await supa.from("ig_comments").update({ batch_id: batch.id }).in("status", ["open", "flagged"]).neq("batch_id", batch.id);

  const { data: pending } = await supa
    .from("ig_comments")
    .select("username, text, status")
    .eq("batch_id", batch.id)
    .in("status", ["open", "flagged"])
    .order("commented_at", { ascending: false });
  const list = pending ?? [];
  log({ step: "drafted", new: todo.length, pending: list.length });

  const to = process.env.KENDRA_REPLY_EMAIL;
  if (!list.length || !to) return { status: "done", newComments: todo.length, inBatch: list.length, emailed: false };

  const mail = morningEmail(
    createPickerToken(batch.id),
    list.map((r) => ({ username: r.username, text: r.text, flagged: r.status === "flagged" })),
  );
  const sent = await sendEmail({ to, ...mail });
  if (sent.status === "sent") {
    await supa.from("ig_batches").update({ emailed_at: new Date().toISOString(), comment_count: list.length }).eq("id", batch.id);
  }
  return { status: "done", newComments: todo.length, inBatch: list.length, emailed: sent.status === "sent" };
}

/* The picker */

export type Viewer = { kind: "admin" } | { kind: "link"; batchId: string };

export async function batchIsLive(batchId: string): Promise<boolean> {
  const supa = createServiceClient();
  const { data } = await supa.from("ig_batches").select("revoked_at").eq("id", batchId).maybeSingle();
  return !!data && !data.revoked_at;
}

export async function listForViewer(v: Viewer): Promise<{ pending: CommentRow[]; done: CommentRow[] }> {
  const supa = createServiceClient();
  let q = supa.from("ig_comments").select("*").order("commented_at", { ascending: false }).limit(100);
  if (v.kind === "link") q = q.eq("batch_id", v.batchId);
  else q = q.or(`status.in.(open,flagged,posting),decided_at.gte.${new Date(Date.now() - 3 * 864e5).toISOString()}`);
  const { data } = await q;
  const rows = (data ?? []) as CommentRow[];
  return {
    pending: rows.filter((r) => r.status === "open" || r.status === "flagged" || r.status === "posting"),
    done: rows.filter((r) => !(r.status === "open" || r.status === "flagged" || r.status === "posting")),
  };
}

export async function openCount(): Promise<number> {
  try {
    const supa = createServiceClient();
    const { count } = await supa.from("ig_comments").select("id", { count: "exact", head: true }).in("status", ["open", "flagged"]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type Decision =
  | { action: "post"; choice: number }
  | { action: "custom"; text: string }
  | { action: "skip" }
  | { action: "hide" }
  | { action: "leave" };

export type DecideResult = { ok: true; row: CommentRow } | { ok: false; error: string };

export async function decide(v: Viewer, commentId: string, d: Decision): Promise<DecideResult> {
  const supa = createServiceClient();
  const actor = v.kind === "admin" ? "admin" : "kendra";
  const { data: row } = await supa.from("ig_comments").select("*").eq("id", commentId).maybeSingle();
  if (!row) return { ok: false, error: "That comment isn't here anymore." };
  if (v.kind === "link") {
    if (row.batch_id !== v.batchId || !(await batchIsLive(v.batchId))) return { ok: false, error: "This link expired." };
  }
  const now = new Date().toISOString();

  if (d.action === "skip" || d.action === "leave") {
    const from = d.action === "skip" ? ["open"] : ["flagged"];
    const to = d.action === "skip" ? "skipped" : "left";
    const { data } = await supa
      .from("ig_comments")
      .update({ status: to, decided_by: actor, decided_at: now })
      .eq("id", commentId)
      .in("status", from)
      .select("*")
      .maybeSingle();
    return data ? { ok: true, row: data as CommentRow } : { ok: false, error: "Already handled." };
  }

  if (d.action === "hide") {
    const { data: claimed } = await supa
      .from("ig_comments")
      .update({ status: "posting" })
      .eq("id", commentId)
      .in("status", ["open", "flagged"])
      .select("status")
      .maybeSingle();
    if (!claimed) return { ok: false, error: "Already handled." };
    try {
      const { token } = await getToken();
      await hideComment(token, commentId);
      const { data } = await supa
        .from("ig_comments")
        .update({ status: "hidden", decided_by: actor, decided_at: now, error: null })
        .eq("id", commentId)
        .select("*")
        .single();
      return { ok: true, row: data as CommentRow };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await supa.from("ig_comments").update({ status: row.status, error }).eq("id", commentId);
      return { ok: false, error: "Instagram didn't take that. Try again in a minute." };
    }
  }

  // post or custom: one claim so a double tap or a second phone can't post twice.
  let text: string | null;
  if (d.action === "post") {
    const opts = (row.options ?? []) as string[];
    text = Number.isInteger(d.choice) ? (opts[d.choice] ?? null) : null;
  } else {
    text = cleanCustom(d.text);
  }
  if (!text) return { ok: false, error: d.action === "post" ? "That option isn't there." : "Type a reply first (500 characters max)." };

  const { data: claimed } = await supa
    .from("ig_comments")
    .update({ status: "posting" })
    .eq("id", commentId)
    .in("status", d.action === "custom" ? ["open", "flagged"] : ["open"])
    .select("status")
    .maybeSingle();
  if (!claimed) return { ok: false, error: "Already handled." };

  try {
    const { token } = await getToken();
    const replyId = await replyToComment(token, commentId, text);
    const { data } = await supa
      .from("ig_comments")
      .update({
        status: "posted",
        posted_text: text,
        chosen_index: d.action === "post" ? d.choice : null,
        custom_text: d.action === "custom" ? text : null,
        reply_id: replyId,
        decided_by: actor,
        decided_at: now,
        error: null,
      })
      .eq("id", commentId)
      .select("*")
      .single();
    log({ step: "posted", comment: commentId, by: actor });
    return { ok: true, row: data as CommentRow };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    log({ step: "post-failed", comment: commentId, error });
    await supa.from("ig_comments").update({ status: row.status, error }).eq("id", commentId);
    return { ok: false, error: "Instagram didn't take that. Try again in a minute." };
  }
}

export async function revokeAllLinks(): Promise<void> {
  const supa = createServiceClient();
  await supa.from("ig_batches").update({ revoked_at: new Date().toISOString() }).is("revoked_at", null);
}
