import { createServiceClient } from "@/lib/supabase/server";
import type { TimeAnchor } from "@/lib/schedule";

export async function getAllAnchorsForUser(userId: string): Promise<TimeAnchor[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("time_anchors")
    .select("*")
    .eq("user_id", userId)
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as TimeAnchor[];
}

export async function createAnchor(input: {
  user_id: string;
  date: string | null;
  start_time: string;
  end_time: string;
  title: string;
  subtitle: string | null;
  emoji: string;
  recurring_pattern: string | null;
}): Promise<TimeAnchor> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("time_anchors").insert(input).select().single();
  if (error) throw error;
  return data as TimeAnchor;
}

export async function deleteAnchor(id: string): Promise<void> {
  const supa = createServiceClient();
  const { error } = await supa.from("time_anchors").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAnchor(
  id: string,
  patch: Partial<{
    start_time: string;
    end_time: string;
    title: string;
    subtitle: string | null;
    emoji: string;
    date: string | null;
    recurring_pattern: string | null;
  }>
): Promise<void> {
  const supa = createServiceClient();
  const { error } = await supa.from("time_anchors").update(patch).eq("id", id);
  if (error) throw error;
}
