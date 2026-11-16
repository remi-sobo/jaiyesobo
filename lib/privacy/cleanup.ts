import { createServiceClient } from "@/lib/supabase/server";

/**
 * Nightly cleanup that keeps the privacy page true. Runs from the nightly
 * cron (app/api/cron/sportsbook). If you change a number here, change the
 * privacy page (components/legal/privacy-body.tsx) in the same commit.
 *
 * - Spam log: IP addresses in pin_attempts are deleted after 30 days. The
 *   longest window that reads them is an hour, so nothing depends on older rows.
 * - Unconfirmed emails: an address nobody confirmed (a parent who never tapped
 *   yes, included) is deleted 14 days after its last confirm email. COPPA asks
 *   us to delete a parent's address if they don't say yes in a reasonable time.
 *   The confirm catch-up only retries for 7 days, so 14 leaves room.
 */
export const IP_LOG_DAYS = 30;
export const UNCONFIRMED_EMAIL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The ISO time before which rows are old enough to delete. */
export function cutoff(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

export type CleanupResult = { ipRows: number; unconfirmedEmails: number };

export async function privacyCleanup(now: Date = new Date()): Promise<CleanupResult> {
  const supa = createServiceClient();

  const ips = await supa.from("pin_attempts").delete({ count: "exact" }).lt("attempted_at", cutoff(IP_LOG_DAYS, now));
  if (ips.error) throw ips.error;

  // Their send log goes with them (on delete cascade).
  const subs = await supa
    .from("sb_subscribers")
    .delete({ count: "exact" })
    .eq("status", "pending")
    .lt("updated_at", cutoff(UNCONFIRMED_EMAIL_DAYS, now));
  if (subs.error) throw subs.error;

  return { ipRows: ips.count ?? 0, unconfirmedEmails: subs.count ?? 0 };
}
