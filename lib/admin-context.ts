import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

const ACTIVE_KID_COOKIE = "active_kid_id";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export type Kid = { id: string; display_name: string };

/**
 * Active-kid resolution for admin contexts.
 *
 * Reads `active_kid_id` cookie set by the kid switcher. Falls back to the
 * first kid (by created_at), which is Jaiye for backwards compat — this
 * preserves single-kid behavior for any admin entry point that hasn't been
 * audited yet.
 *
 * NEVER trust the cookie value blindly: we always re-fetch the user row
 * from Supabase to confirm the kid still exists with role='kid'.
 */
export async function getActiveKid(): Promise<Kid> {
  const supa = createServiceClient();
  const cookieStore = await cookies();
  const cookieKidId = cookieStore.get(ACTIVE_KID_COOKIE)?.value;

  if (cookieKidId) {
    const { data } = await supa
      .from("users")
      .select("id, display_name")
      .eq("id", cookieKidId)
      .eq("role", "kid")
      .maybeSingle();
    if (data) return data as Kid;
    // cookie referenced a non-existent kid — fall through to default
  }

  const { data: fallback, error } = await supa
    .from("users")
    .select("id, display_name")
    .eq("role", "kid")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!fallback) {
    throw new Error("No kid users in DB — run npx tsx scripts/seed.ts");
  }
  return fallback as Kid;
}

/** Every kid in the system, ordered by creation. Used by the switcher pill UI. */
export async function getAllKids(): Promise<Kid[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("users")
    .select("id, display_name")
    .eq("role", "kid")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Kid[];
}

/** Cookie options shared by setter + clearer. */
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ONE_YEAR_SEC,
};

/** Server-action helper to set the active kid cookie. */
export async function setActiveKid(kidId: string) {
  const c = await cookies();
  c.set(ACTIVE_KID_COOKIE, kidId, cookieOpts);
}
