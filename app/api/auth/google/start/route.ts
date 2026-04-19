import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { buildAuthUrl } from "@/lib/google/drive";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/lock", req.url));
  }
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;
  const state = createOAuthState();
  const url = buildAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
