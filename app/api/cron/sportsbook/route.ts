import { NextResponse } from "next/server";
import { nightlySync } from "@/lib/sportsbook/data";
import { closeoutJob, weeklyJob } from "@/lib/sportsbook/actions";
import { privacyCleanup } from "@/lib/privacy/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/sportsbook?job=nightly|weekly|closeout
 *
 * Called by Vercel Cron (see vercel.json). With CRON_SECRET set, Vercel sends
 * it as a bearer token and nothing else gets in. Without it, only Vercel's
 * cron user agent is accepted. Both jobs are safe to run twice.
 *
 * closeout runs every 15 minutes from Monday 02:00 to 11:45 UTC (Sunday about
 * 6pm to Monday 3am Pacific): it closes a week right after Sunday's last game
 * and sends the recap and results email then (see closeoutJob).
 *
 * Schedules (vercel.json, UTC): nightly at 10:00; weekly Monday at 11:00
 * (3am Pacific Monday). The weekly job must run after the Pacific week has
 * ended and after the nightly's last grading pass, so currentWeekNumber() is
 * the NEW week and the week that just ended is n - 1.
 *
 * Weekly autopilot (lib/sportsbook/autopilot.ts), no extra crons: the nightly
 * job drafts next week on Saturday and Sunday (Pacific) if it has no slate, and
 * opens any drafted week whose time has come. A week Remi approved opens Sunday
 * 6:00pm Pacific (or after the previous week's last lock, if later); the live
 * sync opens it at that moment on the first page view, otherwise the nightly
 * does. Not approved, it opens when the week starts, Monday 12:00am Pacific. The
 * weekly job drafts a missing current week first, then opens whatever is ready.
 *
 * The nightly job also runs the privacy cleanup (lib/privacy/cleanup.ts): old
 * spam-log IPs and never-confirmed email addresses are deleted.
 *
 * Both also send the "graded" push (and weekly the "recap" one) through
 * lib/sportsbook/push.ts. Those are keyed by week, so a rerun sends nothing new.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const allowed = secret ? auth === `Bearer ${secret}` : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const job = new URL(req.url).searchParams.get("job");
  if (job !== "weekly" && job !== "closeout") {
    // Its own try, so a cleanup failure never stops grading, and the other way round.
    try {
      console.log(JSON.stringify({ scope: "privacy.cleanup", result: await privacyCleanup() }));
    } catch (e) {
      console.error(JSON.stringify({ scope: "privacy.cleanup", err: String(e) }));
    }
  }
  try {
    const result = job === "weekly" ? await weeklyJob() : job === "closeout" ? await closeoutJob() : await nightlySync();
    console.log(JSON.stringify({ scope: "sportsbook.cron", job, result }));
    return NextResponse.json({ ok: true, job, result });
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.cron", job, err: String(e) }));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
