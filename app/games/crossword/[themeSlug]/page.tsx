import { notFound } from "next/navigation";
import GameShell from "@/components/games/game-shell";
import { getPlayableCrosswordByThemeSlug } from "@/lib/games/crossword-data";
import CrosswordGame from "@/components/games/crossword/crossword-game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ themeSlug: string }> };

export default async function CrosswordPlayPage({ params }: Props) {
  const { themeSlug } = await params;
  const pack = await getPlayableCrosswordByThemeSlug(themeSlug);
  if (!pack || !pack.payload.crossword_grid) notFound();

  return (
    <GameShell liveLabel={`Crossword · ${pack.payload.title}`}>
      <CrosswordGame
        themeSlug={pack.payload.theme_slug}
        title={pack.payload.title}
        subtitle={pack.payload.subtitle}
        difficulty={pack.payload.difficulty}
        layout={pack.payload.crossword_grid}
      />
    </GameShell>
  );
}
