import { NextResponse } from "next/server";
import { morningRun } from "@/lib/instagram/data";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/instagram
 *
 * The 6am reply picker job (docs/INSTAGRAM-REPLIES-SPEC.md). Vercel Cron runs
 * on UTC, so vercel.json calls this at 13:00 and 14:00 UTC and the job only
 * works when it's 6am in Los Angeles: 14:00 UTC in winter, 13:00 in summer.
 * One batch per Pacific date, so a rerun sends no second email.
 *
 * Same auth as the sportsbook cron. `?force=1` runs it at any hour and sends
 * again, for a first test; it only works with CRON_SECRET set and sent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const allowed = secret ? auth === `Bearer ${secret}` : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const force = !!secret && new URL(req.url).searchParams.get("force") === "1";
  const result = await morningRun({ force });
  return NextResponse.json(result, { status: result.status === "error" ? 500 : 200 });
}
