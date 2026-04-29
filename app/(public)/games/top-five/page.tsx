import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import TopFiveGame from "@/components/games/top-five/top-five-game";
import { getTodayContent } from "@/lib/games/data";

export const metadata: Metadata = {
  title: "Top 5 [Blank] — Jaiye's Games",
  description: "Pick your top 5 NBA players in any category. AI judges your list. Curated by Jaiye Sobo.",
};

export const dynamic = "force-dynamic";

export default async function TopFivePage() {
  const content = await getTodayContent("top-five");

  if (!content) {
    return (
      <GameShell>
        <main className="max-w-[640px] mx-auto px-6 py-24 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-tight mb-3">
            No prompt yet.
          </h1>
          <p className="text-[var(--color-mute)] mb-8">
            Jaiye hasn&apos;t added today&apos;s Top 5 prompt. Check back soon.
          </p>
          <Link
            href="/games"
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            ← Back to games
          </Link>
        </main>
      </GameShell>
    );
  }

  const promptText =
    typeof (content.payload as Record<string, unknown>)?.prompt === "string"
      ? ((content.payload as Record<string, unknown>).prompt as string)
      : "Top 5 NBA Players of all time";

  return (
    <GameShell liveLabel={`Today's prompt · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}>
      <TopFiveGame promptId={content.id} promptText={promptText} />
    </GameShell>
  );
}
