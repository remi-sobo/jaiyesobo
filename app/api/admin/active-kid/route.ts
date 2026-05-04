import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { setActiveKid, getAllKids } from "@/lib/admin-context";

/**
 * POST /api/admin/active-kid { kid_id }
 *
 * Sets the active_kid_id cookie. Validates that the kid exists with role='kid'
 * (server-side; never trust the client to pick an arbitrary id).
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { kid_id?: unknown };
  try {
    body = (await req.json()) as { kid_id?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const kidId = typeof body.kid_id === "string" ? body.kid_id : null;
  if (!kidId) {
    return NextResponse.json({ error: "missing_kid_id" }, { status: 400 });
  }

  const kids = await getAllKids();
  const valid = kids.some((k) => k.id === kidId);
  if (!valid) {
    return NextResponse.json({ error: "unknown_kid" }, { status: 404 });
  }

  await setActiveKid(kidId);
  return NextResponse.json({ ok: true, kid_id: kidId });
}
