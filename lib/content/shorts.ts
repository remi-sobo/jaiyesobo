import { getEpisode } from "./episodes";

/** A vertical clip cut from an episode. The files live in /public/shorts. */
export type Short = {
  id: string;
  /** The line that sells it. Shown under the clip. */
  title: string;
  /** Length in seconds. */
  seconds: number;
  /** The episode it was cut from. The clip links to the full thing. */
  episodeSlug: string;
};

/** Newest first. Built by the on-the-court-edit skill (build_shorts.py). */
export const shorts: Short[] = [
  { id: "ep03-dont-tell-my-dad", title: "Don't tell my dad I made a second account", seconds: 38, episodeSlug: "sportsbook-week-2" },
  { id: "ep03-negative-nine", title: "I finished at 19. I mean 17. I mean...", seconds: 30, episodeSlug: "sportsbook-week-2" },
  { id: "ep03-zero-votes-for-dad", title: "Zero votes for my dad", seconds: 30, episodeSlug: "sportsbook-week-2" },
  { id: "ep03-dumb-dums", title: "Whoever picked Phoenix...", seconds: 32, episodeSlug: "sportsbook-week-2" },
  { id: "ep03-that-was-luck", title: "Everybody said Cade. That was luck.", seconds: 24, episodeSlug: "sportsbook-week-2" },
  { id: "ep03-i-believe-in-portland", title: "I believe in Portland all the way", seconds: 31, episodeSlug: "sportsbook-week-2" },
];

export const shortVideo = (s: Short) => `/shorts/${s.id}.mp4`;
export const shortPoster = (s: Short) => `/shorts/${s.id}.jpg`;

/** What the player needs about each clip's episode, resolved on the server. */
export function shortsWithEpisodes() {
  return shorts.flatMap((s) => {
    const ep = getEpisode(s.episodeSlug);
    if (!ep) return [];
    return [{ ...s, video: shortVideo(s), poster: shortPoster(s), episodeNumber: ep.number, episodeTitle: ep.title }];
  });
}

export type ShortWithEpisode = ReturnType<typeof shortsWithEpisodes>[number];
