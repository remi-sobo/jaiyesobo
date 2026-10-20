import { NextResponse } from "next/server";
import { nightlySync } from "@/lib/sportsbook/data";
import { weeklyJob } from "@/lib/sportsbook/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/sportsbook?job=nightly|weekly
 *
 * Called by Vercel Cron (see vercel.json). With CRON_SECRET set, Vercel sends
 * it as a bearer token and nothing else gets in. Without it, only Vercel's
 * cron user agent is accepted. Both jobs are safe to run twice.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const allowed = secret ? auth === `Bearer ${secret}` : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const job = new URL(req.url).searchParams.get("job");
  try {
    const result = job === "weekly" ? await weeklyJob() : await nightlySync();
    console.log(JSON.stringify({ scope: "sportsbook.cron", job, result }));
    return NextResponse.json({ ok: true, job, result });
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.cron", job, err: String(e) }));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
