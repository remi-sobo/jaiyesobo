import type { Metadata } from "next";
import GameShell from "@/components/games/game-shell";
import BlindRankGame from "@/components/games/blind-rank/blind-rank-game";
import { getLiveBlindRankTopics } from "@/lib/games/blind-rank-data";

export const metadata: Metadata = {
  title: "Blind Rank · Jaiye's Games",
  description: "One at a time. No take-backs. NBA ranking puzzles curated by Jaiye Sobo, age 8.",
  openGraph: {
    title: "Blind Rank",
    description: "One at a time. No take-backs.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function BlindRankPage() {
  const topics = await getLiveBlindRankTopics();
  const slim = topics.map((t) => ({ id: t.id, payload: t.payload }));
  return (
    <GameShell liveLabel="Blind Rank · Live">
      <BlindRankGame topics={slim} />
    </GameShell>
  );
}
