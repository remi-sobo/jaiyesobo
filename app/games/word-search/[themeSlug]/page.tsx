import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GameShell from "@/components/games/game-shell";
import WordSearchGame from "@/components/games/word-search/word-search-game";
import { getWordPackByThemeSlug } from "@/lib/games/word-search-data";

type Props = { params: Promise<{ themeSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { themeSlug } = await params;
  const pack = await getWordPackByThemeSlug(themeSlug);
  if (!pack) return { title: "Word Search · Jaiye's Games" };
  return {
    title: `${pack.payload.title} · Word Search · Jaiye's Games`,
    description: pack.payload.subtitle || "Themed NBA word search puzzles.",
  };
}

export default async function WordSearchPlayPage({ params }: Props) {
  const { themeSlug } = await params;
  const pack = await getWordPackByThemeSlug(themeSlug);
  if (!pack || pack.status !== "live" || pack.verification_status !== "verified") {
    notFound();
  }

  return (
    <GameShell liveLabel="Word Search · Live">
      <WordSearchGame
        themeSlug={pack.payload.theme_slug}
        packTitle={pack.payload.title}
        packSubtitle={pack.payload.subtitle}
        difficulty={pack.payload.difficulty}
        gridSize={pack.payload.grid_size}
        words={pack.payload.words}
      />
    </GameShell>
  );
}
