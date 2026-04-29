import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";

export const metadata: Metadata = {
  title: "About Jaiye's Games",
  description:
    "What jaiyesobo.com/games is, who Jaiye is, why it exists. A father-son NBA games project from East Palo Alto.",
};

export default function AboutGamesPage() {
  return (
    <GameShell>
      <main className="max-w-[680px] mx-auto px-6 py-20">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
          About these games
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-8">
          A real kid<span className="italic font-normal text-[var(--color-red)]">.</span> Real basketball<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>

        <div className="flex flex-col gap-6 font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-relaxed text-[var(--color-bone)]">
          <p>
            Jaiye is 8 years old. He lives in East Palo Alto, California. He loves basketball, building things, his family, and Jesus.
          </p>
          <p>
            This is a games platform he&apos;s curating with his dad. He picks the prompts. He writes the trivia. He builds the player pools. AI helps with judging — but Jaiye runs the game.
          </p>
          <p>
            Every game is hand-built, not algorithmically generated. New prompts and questions land every week. The platform grows because he keeps showing up.
          </p>
          <p className="italic text-[var(--color-mute)] text-[1rem] leading-snug border-l-2 border-[var(--color-red)] pl-5 mt-2">
            &ldquo;Curated by Jaiye Sobo, age 8 · A father-son project from East Palo Alto.&rdquo;
          </p>
          <p>
            We made this because the personal site is a portfolio, but the games platform is a destination. Friends bring friends. Jaiye&apos;s name reaches people who&apos;ve never heard of him. That&apos;s the goal — and the fun.
          </p>
          <p>
            No ads. No data harvesting. Anonymous play by default. If you want to save your streak, sign in with your email and you&apos;re in.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            href="/games"
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors text-center"
          >
            ← Back to games
          </Link>
          <Link
            href="/"
            className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            Visit jaiyesobo.com
          </Link>
        </div>
      </main>
    </GameShell>
  );
}
