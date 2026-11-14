import { NextResponse } from "next/server";
import { confirm } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/confirm (form field `t`): the "Yes" button on /email/confirm.
 * Confirming only happens here, on a tap, never on opening the email link.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const t = typeof form?.get("t") === "string" ? String(form?.get("t")) : "";
  const res = await confirm(t);
  const url = new URL("/email/confirm", req.url);
  // A fresh token for the confirmed row, so the page can show the result (the old one was for the row before it changed).
  url.searchParams.set("t", res.ok ? res.token : t);
  url.searchParams.set(res.ok ? "done" : "failed", "1");
  return NextResponse.redirect(url, 303);
}
