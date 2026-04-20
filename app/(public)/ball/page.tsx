import type { Metadata } from "next";
import ComingSoon from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Ball · Jaiye Sobo",
  description: "Highlights, recaps, and what I'm working on in the gym.",
};

export default function BallPage() {
  return (
    <ComingSoon
      section="Ball"
      number="01"
      tagline="Highlights, recaps, what I'm working on in the gym."
      description="This is where the basketball lives. Game film, tournament write-ups, training notes, and the long climb of getting better."
      coming={[
        "First tournament recaps with full game stats and play-by-plays",
        "Training journal: what I'm working on each week",
        "Highlight reel video drops",
        "My all-time NBA lists (because Dad and I argue about this constantly)",
      ]}
    />
  );
}
