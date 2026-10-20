import { createServiceClient } from "@/lib/supabase/server";
import { buildContext, draftOne, draftSlate, half, writeRecap, type DraftItem } from "./draft";
import { getItems, getPicks, getPlayers, getSubmissions, getWeek, gradeWeek, nightlySync, weekBoard } from "./data";
import { pickPoints } from "./grade";
import type { ItemOption, SbItem, SbPick, SbWeek } from "./types";
import { SB_SEASON, currentWeekNumber, weekWindow } from "./weeks";

const db = () => createServiceClient();

export class ActionError extends Error {}

async function ensureWeek(n: number): Promise<SbWeek> {
  const existing = await getWeek(n);
  if (existing) return existing;
  const w = weekWindow(n);
  const { data, error } = await db()
    .from("sb_weeks")
    .insert({ season: SB_SEASON, week_number: n, starts_on: w.starts_on, ends_on: w.ends_on })
    .select("id, season, week_number, starts_on, ends_on, status, recap, finalized_at")
    .single();
  if (error) throw error;
  return data as SbWeek;
}

function rows(weekId: string, items: DraftItem[], startSort = 0) {
  return items.map((i, k) => ({ ...i, week_id: weekId, sort: startSort + k }));
}

async function recentPrompts(n: number): Promise<string[]> {
  const prev = await getWeek(n - 1);
  return prev ? (await getItems(prev.id)).map((i) => i.prompt) : [];
}

/** AI drafts (or redrafts) a week's slate. Only while the week is a draft. */
export async function draftWeek(n: number): Promise<number> {
  const week = await ensureWeek(n);
  if (week.status !== "draft") throw new ActionError("This week is already open.");
  const ctx = await buildContext(n);
  const items = await draftSlate(ctx, await recentPrompts(n));
  const supa = db();
  const { error: delErr } = await supa.from("sb_items").delete().eq("week_id", week.id).neq("type", "custom");
  if (delErr) throw delErr;
  const { data: kept } = await supa.from("sb_items").select("id").eq("week_id", week.id);
  const { error } = await supa.from("sb_items").insert(rows(week.id, items, (kept ?? []).length));
  if (error) throw error;
  return items.length;
}

async function draftItemAndWeek(itemId: string): Promise<{ item: SbItem; week: SbWeek }> {
  const { data, error } = await db()
    .from("sb_items")
    .select("id, week_id, sort, type, prompt, note, options, points, spec, locks_at, status, result, sb_weeks!inner(id, season, week_number, starts_on, ends_on, status, recap, finalized_at)")
    .eq("id", itemId)
    .single();
  if (error || !data) throw new ActionError("Pick not found.");
  const { sb_weeks, ...item } = data as unknown as SbItem & { sb_weeks: SbWeek };
  return { item, week: sb_weeks };
}

export async function regenerateItem(itemId: string): Promise<void> {
  const { item, week } = await draftItemAndWeek(itemId);
  if (week.status !== "draft") throw new ActionError("You can only swap picks before the week opens.");
  if (item.type === "custom") throw new ActionError("Edit Jaiye's Prop by hand instead.");
  const ctx = await buildContext(week.week_number);
  const avoid = [...(await getItems(week.id)).map((i) => i.prompt), ...(await recentPrompts(week.week_number))];
  const next = await draftOne(ctx, avoid, item.type);
  const { error } = await db()
    .from("sb_items")
    .update({ type: next.type, prompt: next.prompt, note: next.note, options: next.options, points: next.points, spec: next.spec, locks_at: next.locks_at })
    .eq("id", itemId);
  if (error) throw error;
}

export async function removeItem(itemId: string): Promise<void> {
  const { week } = await draftItemAndWeek(itemId);
  if (week.status !== "draft") throw new ActionError("You can only remove picks before the week opens.");
  const { error } = await db().from("sb_items").delete().eq("id", itemId);
  if (error) throw error;
}

/** Edit the words, points or line of a draft item. Line edits rewrite the option labels too. */
export async function updateItem(itemId: string, patch: { prompt?: string; note?: string; points?: number; line?: number }): Promise<void> {
  const { item, week } = await draftItemAndWeek(itemId);
  if (week.status !== "draft") throw new ActionError("You can only edit picks before the week opens.");
  const update: Partial<SbItem> = {};
  if (typeof patch.prompt === "string" && patch.prompt.trim()) update.prompt = patch.prompt.trim().slice(0, 140);
  if (typeof patch.note === "string") update.note = patch.note.trim().slice(0, 200) || null;
  if (typeof patch.points === "number") update.points = Math.min(10, Math.max(1, Math.round(patch.points)));
  if (typeof patch.line === "number" && "line" in item.spec) {
    const line = half(patch.line);
    update.spec = { ...item.spec, line } as SbItem["spec"];
    update.options = item.options.map((o): ItemOption => {
      if (o.key === "over") return { ...o, label: `Over ${line}` };
      if (o.key === "under") return { ...o, label: `Under ${line}` };
      if (item.type === "spread" && o.key === "yes") return { ...o, label: `${o.team} by ${Math.ceil(line)}+` };
      return o;
    });
  }
  const { error } = await db().from("sb_items").update(update).eq("id", itemId);
  if (error) throw error;
}

/** Jaiye's Prop: a question he writes, graded by hand. */
export async function addProp(n: number, input: { prompt: string; options: string[]; points: number; locks_at: string }): Promise<void> {
  const week = await ensureWeek(n);
  if (week.status === "final") throw new ActionError("That week is final.");
  const prompt = input.prompt.trim().slice(0, 140);
  const opts = input.options.map((o) => o.trim().slice(0, 40)).filter(Boolean).slice(0, 4);
  if (!prompt) throw new ActionError("Write the question.");
  if (opts.length < 2) throw new ActionError("Give at least 2 answers.");
  const locks = new Date(input.locks_at);
  if (Number.isNaN(locks.getTime()) || locks <= new Date()) throw new ActionError("Pick a lock time in the future.");
  const count = (await getItems(week.id)).length;
  const { error } = await db().from("sb_items").insert({
    week_id: week.id,
    sort: count,
    type: "custom",
    prompt,
    note: "Written by Jaiye.",
    options: opts.map((label, i) => ({ key: String(i), label })),
    points: Math.min(3, Math.max(1, Math.round(input.points))),
    spec: { type: "custom" },
    locks_at: locks.toISOString(),
  });
  if (error) throw error;
}

export async function openWeek(n: number): Promise<void> {
  const week = await getWeek(n);
  if (!week || week.status !== "draft") throw new ActionError("Nothing to open.");
  const items = await getItems(week.id);
  if (items.length === 0) throw new ActionError("Add some picks first.");
  const { error } = await db().from("sb_weeks").update({ status: "open" }).eq("id", week.id);
  if (error) throw error;
}

/** Saves one player's answer. The database refuses it after tip-off. */
export async function savePick(
  itemId: string,
  playerId: string,
  input: { choice?: string | null; guess?: number | null; is_lock?: boolean; talk?: string | null },
): Promise<void> {
  const { item, week } = await draftItemAndWeek(itemId);
  if (week.status !== "open") throw new ActionError("This week isn't open.");
  if (new Date(item.locks_at) <= new Date()) throw new ActionError("That pick is locked.");
  if ((await getSubmissions(week.id)).includes(playerId)) throw new ActionError("These picks are submitted and locked.");
  const supa = db();
  const { data: prev } = await supa.from("sb_picks").select("choice, guess, is_lock, talk").eq("item_id", itemId).eq("player_id", playerId).maybeSingle();

  let choice = prev?.choice ?? null;
  let guess = prev?.guess === undefined || prev?.guess === null ? null : Number(prev.guess);
  if (input.choice !== undefined) {
    if (input.choice !== null && !item.options.some((o) => o.key === input.choice)) throw new ActionError("Not a valid answer.");
    choice = input.choice;
  }
  if (input.guess !== undefined) {
    if (input.guess !== null && (!Number.isFinite(input.guess) || input.guess < 0 || input.guess > 999)) throw new ActionError("Guess a number from 0 to 999.");
    guess = input.guess === null ? null : Math.round(input.guess);
  }
  const isLock = input.is_lock ?? prev?.is_lock ?? false;
  const talk = input.talk !== undefined ? (input.talk?.trim().slice(0, 80) || null) : (prev?.talk ?? null);
  if (isLock && choice === null && guess === null) throw new ActionError("Make the pick before you lock it.");

  if (input.is_lock === true) {
    // Moving the lock: clear it from any other pick this week first.
    const ids = (await getItems(week.id)).map((i) => i.id).filter((id) => id !== itemId);
    if (ids.length) {
      const { error } = await supa.from("sb_picks").update({ is_lock: false }).eq("player_id", playerId).eq("is_lock", true).in("item_id", ids);
      if (error) throw new ActionError("Your lock is on a pick that already started. It stays there.");
    }
  }
  const { error } = await supa
    .from("sb_picks")
    .upsert({ item_id: itemId, player_id: playerId, choice, guess, is_lock: isLock, talk }, { onConflict: "item_id,player_id" });
  if (error) {
    if (error.message.includes("submitted")) throw new ActionError("These picks are submitted and locked.");
    throw new ActionError(error.message.includes("locked") ? "That pick is locked." : "Couldn't save that pick.");
  }
}

/**
 * Jaiye or Remi submits: every pick for the week locks for good and goes public.
 * Every card that hasn't tipped off yet needs an answer first.
 */
export async function submitPicks(n: number, playerId: string): Promise<void> {
  const week = await getWeek(n);
  if (!week || week.status !== "open") throw new ActionError("This week isn't open.");
  const items = await getItems(week.id);
  const picks = (await getPicks(items.map((i) => i.id))).filter((p) => p.player_id === playerId);
  const now = Date.now();
  const missing = items.filter((i) => {
    if (Date.parse(i.locks_at) <= now) return false;
    const p = picks.find((x) => x.item_id === i.id);
    return !p || (p.choice === null && p.guess === null);
  });
  if (missing.length) throw new ActionError(`Pick ${missing.length} more ${missing.length === 1 ? "card" : "cards"} first.`);
  const { error } = await db().from("sb_submissions").insert({ week_id: week.id, player_id: playerId });
  if (error) {
    if (error.code === "23505") return;
    throw new ActionError(error.code === "42P01" ? "Submitting needs migration 026 first." : "Couldn't submit.");
  }
}

/** Hand grading for Jaiye's Prop, or voiding any pick. */
export async function gradeByHand(itemId: string, winner: string | null): Promise<void> {
  const { item, week } = await draftItemAndWeek(itemId);
  if (week.status === "final" || week.status === "draft") throw new ActionError("Can't grade this week.");
  if (winner === null) {
    const { error } = await db().from("sb_items").update({ status: "void", result: { winners: [], actual: null, display: "Voided" } }).eq("id", itemId);
    if (error) throw error;
    return;
  }
  const opt = item.options.find((o) => o.key === winner);
  if (!opt) throw new ActionError("Not a valid answer.");
  const { error } = await db()
    .from("sb_items")
    .update({ status: "graded", result: { winners: [winner], actual: null, display: `Answer: ${opt.label}` } })
    .eq("id", itemId);
  if (error) throw error;
}

export async function refresh(): Promise<Awaited<ReturnType<typeof nightlySync>>> {
  return nightlySync();
}

function answerLabel(item: SbItem, pick: SbPick | undefined): string {
  if (!pick) return "no pick";
  if (item.type === "closest") return pick.guess === null ? "no pick" : String(pick.guess);
  return item.options.find((o) => o.key === pick.choice)?.label ?? "no pick";
}

export async function makeRecap(n: number): Promise<string> {
  const week = await getWeek(n);
  if (!week) throw new ActionError("No such week.");
  const items = await getItems(week.id);
  const picks = await getPicks(items.map((i) => i.id));
  const players = await getPlayers();
  const board = weekBoard(items, picks, players);
  const remi = players.find((p) => p.kind === "remi");
  const jaiye = players.find((p) => p.kind === "jaiye");
  const text = await writeRecap({
    week: n,
    board: board.map((b) => ({ name: b.player.display_name, ...b.score })),
    items: items.map((i) => {
      const jp = picks.find((p) => p.item_id === i.id && p.player_id === jaiye?.id);
      const rp = picks.find((p) => p.item_id === i.id && p.player_id === remi?.id);
      const right = (p: SbPick | undefined) => {
        if (!p) return null;
        const pts = pickPoints(i, p, picks);
        return pts === null ? null : pts > 0;
      };
      return {
        prompt: i.prompt,
        result: i.result?.display ?? "not decided",
        jaiye: answerLabel(i, jp),
        remi: answerLabel(i, rp),
        jaiyeRight: right(jp),
        remiRight: right(rp),
      };
    }),
    challengers: board.filter((b) => b.player.kind === "challenger").length,
  });
  await saveRecap(n, text);
  return text;
}

export async function saveRecap(n: number, text: string): Promise<void> {
  const week = await getWeek(n);
  if (!week || week.status === "final") throw new ActionError("Can't edit that recap.");
  const { error } = await db().from("sb_weeks").update({ recap: text.trim().slice(0, 2000) || null }).eq("id", week.id);
  if (error) throw error;
}

export async function finalizeWeek(n: number): Promise<void> {
  const week = await getWeek(n);
  if (!week || week.status !== "graded") throw new ActionError("This week isn't done yet.");
  const items = await getItems(week.id);
  const left = items.filter((i) => i.status === "open");
  if (left.length) throw new ActionError(`${left.length} ${left.length === 1 ? "pick still needs" : "picks still need"} a result.`);
  const { error } = await db().from("sb_weeks").update({ status: "final" }).eq("id", week.id);
  if (error) throw error;
}

/** Monday morning: grade last week, write its recap, draft this week. */
export async function weeklyJob(now = new Date()) {
  const sync = await nightlySync(now);
  const n = currentWeekNumber(now);
  const out: Record<string, unknown> = { sync, week: n };
  const last = n > 1 ? await getWeek(n - 1) : null;
  if (last && (last.status === "open" || last.status === "graded")) {
    await gradeWeek(last, now);
    const fresh = await getWeek(n - 1);
    if (fresh && !fresh.recap) {
      try {
        await makeRecap(n - 1);
        out.recap = true;
      } catch (e) {
        out.recapError = String(e);
      }
    }
  }
  const current = await getWeek(n);
  if (!current || (current.status === "draft" && (await getItems(current.id)).length === 0)) {
    try {
      out.drafted = await draftWeek(n);
    } catch (e) {
      out.draftError = String(e);
    }
  }
  return out;
}
