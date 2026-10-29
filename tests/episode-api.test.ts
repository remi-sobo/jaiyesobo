import { describe, expect, it } from "vitest";
import { episodeForWeek } from "@/lib/app-api/episode";
import { episodes, sportsbookEpisode } from "@/lib/content/episodes";

describe("episodeForWeek", () => {
  it("maps a week's episode to the app API shape", () => {
    const ep = sportsbookEpisode(2);
    expect(ep).toBeDefined();
    expect(episodeForWeek(2)).toEqual({
      number: ep!.number,
      title: ep!.title,
      youtube_url: `https://youtu.be/${ep!.youtubeId}`,
      week: 2,
    });
  });

  it("returns the episode for the asked week, not the newest one", () => {
    expect(episodeForWeek(1)?.week).toBe(1);
    expect(episodeForWeek(1)?.youtube_url).toBe(`https://youtu.be/${sportsbookEpisode(1)!.youtubeId}`);
  });

  it("is null for a week with no episode yet", () => {
    const unused = Math.max(...episodes.flatMap((e) => (e.sportsbookWeek === undefined ? [] : [e.sportsbookWeek]))) + 1;
    expect(episodeForWeek(unused)).toBeNull();
  });

  it("is null when there is no featured week", () => {
    expect(episodeForWeek(null)).toBeNull();
  });
});
