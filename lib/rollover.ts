import { createServiceClient } from "@/lib/supabase/server";

/**
 * Rollover semantics
 * ─────────────────────
 * Some assignments are "do this any day this week" rather than "must finish on
 * date X". Those are flagged with `tasks.rollover = true`. Whenever the kid
 * lands on /me for today, this helper runs once: any rollover task whose date
 * is in the past AND that has no active completion gets its `date` bumped
 * forward to today. The task literally moves to the kid's day until it's done.
 *
 * Idempotent — safe to call on every page load. Cheap path: when there are no
 * candidates the second query is skipped entirely.
 */
export async function rollOverPendingTasks(userId: string, today: string): Promise<number> {
  const supa = createServiceClient();

  // Fetch all rollover tasks dated before today, plus their completions so we
  // can filter out the ones that ARE done (even completed-then-undone tasks
  // are considered open if every completion has a deleted_at).
  const { data: candidates, error: cErr } = await supa
    .from("tasks")
    .select("id, completions(id, deleted_at)")
    .eq("user_id", userId)
    .eq("rollover", true)
    .lt("date", today);
  if (cErr) throw cErr;

  type Row = { id: string; completions: { id: string; deleted_at: string | null }[] | null };
  const idsToBump = ((candidates ?? []) as Row[])
    .filter((t) => !(t.completions ?? []).some((c) => !c.deleted_at))
    .map((t) => t.id);

  if (idsToBump.length === 0) return 0;

  const { error: uErr } = await supa
    .from("tasks")
    .update({ date: today })
    .in("id", idsToBump);
  if (uErr) {
    // Rollover is a best-effort enhancement, not a critical path. Log the
    // error but don't fail the page load over it.
    console.error(JSON.stringify({ scope: "rollover", msg: "update_failed", err: uErr.message }));
    return 0;
  }
  return idsToBump.length;
}
