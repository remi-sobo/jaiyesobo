import { latestEpisode } from "@/lib/content/episodes";
import { shortsWithEpisodes } from "@/lib/content/shorts";
import { SectionLabel } from "@/components/site/type";
import { GhostButton, PlayButton } from "@/components/site/buttons";
import ShortsPlayer from "./shorts-player";

/** The quick way in: thirty-second clips, each one a door to the full episode. */
export default function Shorts() {
  const clips = shortsWithEpisodes();
  if (clips.length === 0) return null;
  const ep = latestEpisode();

  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel tone="red">The Clips</SectionLabel>
            <h2 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,5vw,4rem)] font-black leading-[0.92] tracking-[-0.04em]">
              Thirty seconds
              <br />
              on the <em className="font-normal italic text-[var(--color-red)]">court.</em>
            </h2>
            <p className="mt-4 max-w-[44ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              The best moments from the podcast. Tap one. If you like it, the whole episode is one more tap.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PlayButton href={`/pod/${ep.slug}`}>Watch the full episode</PlayButton>
            <GhostButton href="/pod">All episodes</GhostButton>
          </div>
        </div>

        <div className="mt-[clamp(28px,4vw,48px)]">
          <ShortsPlayer shorts={clips} />
        </div>
      </div>
    </section>
  );
}
