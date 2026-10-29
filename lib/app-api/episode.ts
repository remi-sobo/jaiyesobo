import { sportsbookEpisode } from "@/lib/content/episodes";
import type { ApiEpisode } from "./types";

/**
 * The On The Court episode for a Run It Back week, in the app API's shape, or null
 * when Jaiye hasn't posted one for that week (or there is no week yet). Kept apart
 * from server.ts so it can be tested without a database client.
 */
export function episodeForWeek(week: number | null): ApiEpisode | null {
  if (week === null) return null;
  const ep = sportsbookEpisode(week);
  if (!ep || ep.sportsbookWeek === undefined) return null;
  return { number: ep.number, title: ep.title, youtube_url: `https://youtu.be/${ep.youtubeId}`, week: ep.sportsbookWeek };
}
