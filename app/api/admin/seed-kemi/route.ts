import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed-kemi
 *
 * Idempotent: creates Kemi the user if she doesn't exist. Required
 * before /seed-kemi/anchors and /seed-kemi/starter-week.
 *
 * Reads KEMI_PIN from env (already set on Vercel). User row uses the
 * same `display_name` + bcrypt(`pin_hash`) shape as scripts/seed.ts.
 */
export async function POST() {
  await requireAdmin();

  const pin = process.env.KEMI_PIN;
  if (!pin) {
    return NextResponse.json({ error: "KEMI_PIN not set in env" }, { status: 501 });
  }

  const supa = createServiceClient();

  // Idempotent lookup by display_name (NOT just role='kid' — Jaiye also matches that).
  const { data: existing, error: lookupErr } = await supa
    .from("users")
    .select("id, display_name, role")
    .eq("role", "kid")
    .eq("display_name", "Kemi")
    .maybeSingle();
  if (lookupErr) {
    console.error("seed-kemi lookup failed:", lookupErr);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      kid: existing,
      note: "Kemi already exists",
    });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const { data: created, error: insertErr } = await supa
    .from("users")
    .insert({ role: "kid", display_name: "Kemi", pin_hash: pinHash })
    .select("id, display_name, role")
    .single();
  if (insertErr || !created) {
    console.error("seed-kemi insert failed:", insertErr);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true, kid: created });
}
