import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import GameCard from "@/components/games/game-card";
import { getAllGames } from "@/lib/games/data";

export const metadata: Metadata = {
  title: "Jaiye's Games — NBA games curated by an 8-year-old",
  description:
    "NBA games curated by Jaiye Sobo, age 8. Top 5 lists judged by AI. Trivia. Draft. A father-son project from East Palo Alto.",
  openGraph: {
    title: "Jaiye's Games",
    description: "NBA games curated by Jaiye Sobo, age 8.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function GamesHubPage() {
  const games = await getAllGames();
  // Sort: live first, then beta, then archived
  const ordered = [...games].sort((a, b) => statusRank(a.status) - statusRank(b.status));

  return (
    <GameShell liveLabel="Daily prompts · New verdicts every day">
      <section className="px-6 lg:px-10 pt-20 pb-8 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
          jaiyesobo.com / games
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.04em] mb-6">
          Jaiye&apos;s <span className="italic font-normal text-[var(--color-red)]">Games.</span>
        </h1>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.7vw,1.5rem)] text-[var(--color-bone)] max-w-[44ch] leading-snug mb-10">
          NBA games made by my son. Made for fans. Play one.
        </p>
      </section>

      <section className="px-6 lg:px-10 pb-12 max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ordered.map((g, i) => (
            <GameCard key={g.slug} game={g} number={String(i + 1).padStart(2, "0")} />
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-10 pb-20 max-w-[1100px] mx-auto">
        <Link
          href="/games/about"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-red)] transition-colors"
        >
          About these games <span>→</span>
        </Link>
      </section>
    </GameShell>
  );
}

function statusRank(s: string): number {
  if (s === "live") return 0;
  if (s === "beta") return 1;
  return 2;
}
