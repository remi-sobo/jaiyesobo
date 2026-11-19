import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { buildInstagramAuthUrl, instagramConfigured } from "@/lib/instagram/api";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.redirect(new URL("/admin/lock", req.url));
  if (!instagramConfigured()) return NextResponse.redirect(new URL("/admin/setup?ig_error=not_configured", req.url));
  const redirectUri = `${new URL(req.url).origin}/api/auth/instagram/callback`;
  return NextResponse.redirect(buildInstagramAuthUrl(redirectUri, createOAuthState()));
}
