import type { Metadata } from "next";
import GameShell from "@/components/games/game-shell";
import TheCutGame from "@/components/games/the-cut/the-cut-game";

export const metadata: Metadata = {
  title: "The Cut · Jaiye's Games",
  description: "Keep four. Cut four. Don't blink. NBA puzzles curated by Jaiye Sobo, age 8.",
  openGraph: {
    title: "The Cut",
    description: "Keep four. Cut four. Don't blink.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function TheCutPage() {
  return (
    <GameShell liveLabel="The Cut · Live">
      <TheCutGame />
    </GameShell>
  );
}
