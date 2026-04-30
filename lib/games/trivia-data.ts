import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSession, sessionKey } from "./session";

export async function getStreakForCurrentSession(): Promise<{ current: number; best: number }> {
  const session = await getCurrentSession();
  if (!session) return { current: 0, best: 0 };
  const { user_id, anon_session_id } = sessionKey(session);
  const ident = user_id ? `auth:${user_id}` : anon_session_id ? `anon:${anon_session_id}` : null;
  if (!ident) return { current: 0, best: 0 };
  try {
    const supa = createServiceClient();
    const { data } = await supa
      .from("trivia_streaks")
      .select("current_streak, best_streak")
      .eq("identifier", ident)
      .maybeSingle();
    return {
      current: data?.current_streak ?? 0,
      best: data?.best_streak ?? 0,
    };
  } catch {
    return { current: 0, best: 0 };
  }
}
