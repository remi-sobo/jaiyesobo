import Hero from "@/components/home/hero";
import LatestDrop from "@/components/home/latest-drop";
import OnTheCourt from "@/components/home/on-the-court";
import PlaySomething from "@/components/home/play-something";
import RightNow from "@/components/home/right-now";
import Shorts from "@/components/home/shorts";
import Archive from "@/components/home/archive";
import Reveal from "@/components/site/reveal";
import ThisSeason from "@/components/home/this-season";

// The season section shows live Sportsbook scores, so refresh every 5 minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <main>
      <Hero />
      {/* On The Court first: the show, the column, the clips. */}
      <Reveal>
        <OnTheCourt />
      </Reveal>
      <Reveal>
        <LatestDrop />
      </Reveal>
      <Reveal>
        <Shorts />
      </Reveal>
      {/* Then Play: Run It Back Picks leads, the other games follow. */}
      <Reveal>
        <ThisSeason />
      </Reveal>
      <Reveal>
        <PlaySomething />
      </Reveal>
      <Reveal>
        <RightNow />
      </Reveal>
      <Reveal>
        <Archive />
      </Reveal>
    </main>
  );
}
