import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { connectWithCode } from "@/lib/instagram/api";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.redirect(new URL("/admin/lock", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/admin/setup?ig_error=${encodeURIComponent(error)}`, req.url));
  if (!code || !verifyOAuthState(url.searchParams.get("state"))) {
    return NextResponse.redirect(new URL("/admin/setup?ig_error=invalid_state", req.url));
  }

  // Instagram appends "#_" to the code on some redirects.
  const clean = code.replace(/#_$/, "");
  try {
    const { username } = await connectWithCode(clean, `${url.origin}/api/auth/instagram/callback`);
    return NextResponse.redirect(new URL(`/admin/setup?ig_connected=${encodeURIComponent(username)}`, req.url));
  } catch (err) {
    console.error("Instagram OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/admin/setup?ig_error=exchange_failed", req.url));
  }
}
