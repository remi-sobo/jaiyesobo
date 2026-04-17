import Hero from "@/components/hero";
import LatestDrop from "@/components/latest-drop";
import Portals from "@/components/portals";
import NowStrip from "@/components/now-strip";

export default function Home() {
  return (
    <main>
      <Hero />
      <LatestDrop />
      <Portals />
      <NowStrip />
    </main>
  );
}
