import type { Metadata } from "next";
import GameShell from "@/components/games/game-shell";
import TriviaGame from "@/components/games/trivia/trivia-game";
import { getStreakForCurrentSession } from "@/lib/games/trivia-data";

export const metadata: Metadata = {
  title: "The Court Report — NBA Trivia · Jaiye's Games",
  description:
    "10 NBA trivia questions a day. Pick your difficulty. Don't get cooked. Curated by Jaiye Sobo.",
};

export const dynamic = "force-dynamic";

export default async function TriviaPage() {
  const streak = await getStreakForCurrentSession();

  return (
    <GameShell liveLabel="The Court Report · 10 questions per round">
      <section className="px-6 lg:px-12 pt-20 lg:pt-24 pb-4 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
          jaiyesobo.com / games / trivia
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.04em] mb-6">
          The Court <span className="italic font-normal text-[var(--color-red)]">Report.</span>
        </h1>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.4rem)] text-[var(--color-bone)] max-w-[44ch] leading-snug">
          NBA trivia. 10 questions. 15 seconds each. Don&apos;t get cooked.
        </p>
      </section>

      <TriviaGame initialStreak={streak.current} />
    </GameShell>
  );
}
