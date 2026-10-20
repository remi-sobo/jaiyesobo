import type { Schedule } from "./types";

/**
 * The only place the site states what is coming next.
 *
 * The homepage status strip, the /pod rail and the /now page all describe the
 * same three facts. They read them from here, so the site cannot contradict
 * itself. If a date needs to change, it changes once, here.
 */
export const schedule: Schedule = {
  latestColumnSlug: "ja-to-the-blazers",
  nextColumnTopic: "The rookies who actually matter",
  latestEpisodeSlug: "sportsbook-week-1",
  inStudio: "Ep. 003 · the full Blazers preview",
  nextReleaseDate: "2026-10-27",
  nextRelease: "Ep. 003",
};
