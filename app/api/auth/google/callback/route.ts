import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { exchangeCode, saveTokens } from "@/lib/google/drive";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/lock", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin?drive_error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !verifyOAuthState(state)) {
    return NextResponse.redirect(new URL("/admin?drive_error=invalid_state", req.url));
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  try {
    const tokens = await exchangeCode(code, redirectUri);
    await saveTokens(tokens);
    return NextResponse.redirect(new URL("/admin?drive_connected=1", req.url));
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/admin?drive_error=exchange_failed", req.url));
  }
}
