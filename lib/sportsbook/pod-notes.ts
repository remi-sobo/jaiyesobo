import { createServiceClient } from "@/lib/supabase/server";

/** Jaiye's saved answers for a week's On The Court prep, keyed by prompt key. */
export async function getPodNotes(season: string, week: number): Promise<Record<string, string>> {
  const { data, error } = await createServiceClient()
    .from("sb_pod_notes")
    .select("key, answer")
    .eq("season", season)
    .eq("week_number", week);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.answer as string]));
}

export async function savePodNote(season: string, week: number, key: string, answer: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("sb_pod_notes")
    .upsert(
      { season, week_number: week, key, answer, updated_at: new Date().toISOString() },
      { onConflict: "season,week_number,key" },
    );
  if (error) throw error;
}
