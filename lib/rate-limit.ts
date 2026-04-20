import { createServiceClient } from "@/lib/supabase/server";

const WINDOW_MINUTES = 15;
export const MAX_FAILED = 5;

export type RateLimitState = {
  recentFails: number;
  locked: boolean;
  retryAt: string | null;
};

export function ipFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "local";
}

export function identifierFor(role: "kid" | "admin", req: Request): string {
  return `${role}:ip:${ipFromRequest(req)}`;
}

export async function getRateLimitState(identifier: string): Promise<RateLimitState> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  try {
    const supa = createServiceClient();
    const { data, error } = await supa
      .from("pin_attempts")
      .select("attempted_at, successful")
      .eq("identifier", identifier)
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: false });
    if (error) throw error;
    const fails = (data ?? []).filter((r) => !r.successful);
    if (fails.length >= MAX_FAILED) {
      const oldest = fails[fails.length - 1];
      const retryAt = new Date(new Date(oldest.attempted_at).getTime() + WINDOW_MINUTES * 60_000).toISOString();
      return { recentFails: fails.length, locked: true, retryAt };
    }
    return { recentFails: fails.length, locked: false, retryAt: null };
  } catch {
    // table missing — treat as unlocked
    return { recentFails: 0, locked: false, retryAt: null };
  }
}

export async function recordAttempt(identifier: string, successful: boolean): Promise<void> {
  try {
    const supa = createServiceClient();
    await supa.from("pin_attempts").insert({ identifier, successful });
    if (successful) {
      // Clear prior failures so a correct PIN wipes the warning
      await supa
        .from("pin_attempts")
        .delete()
        .eq("identifier", identifier)
        .eq("successful", false);
    }
  } catch {
    // swallow — rate limit is best-effort
  }
}
