import Hero from "@/components/home/hero";
import LatestDrop from "@/components/home/latest-drop";
import OnTheCourt from "@/components/home/on-the-court";
import PlaySomething from "@/components/home/play-something";
import RightNow from "@/components/home/right-now";
import Archive from "@/components/home/archive";
import Reveal from "@/components/site/reveal";

export default function Home() {
  return (
    <main>
      <Hero />
      <Reveal>
        <LatestDrop />
      </Reveal>
      <Reveal>
        <OnTheCourt />
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
