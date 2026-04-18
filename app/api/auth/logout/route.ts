import { NextResponse } from "next/server";
import { clearKidSession, clearAdminSession } from "@/lib/session";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (scope === "admin") {
    await clearAdminSession();
    return NextResponse.json({ ok: true, redirect: "/admin/lock" });
  }
  await clearKidSession();
  return NextResponse.json({ ok: true, redirect: "/me/lock" });
}
