import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";

export const metadata: Metadata = {
  title: "About Jaiye's Games",
  description:
    "Basketball games I made with my dad. I come up with the rules, we build them together.",
};

export default function AboutGamesPage() {
  return (
    <GameShell>
      <main className="max-w-[680px] mx-auto px-6 py-20">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
          About these games
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-8">
          Real kid<span className="italic font-normal text-[var(--color-red)]">.</span> Real hoops<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>

        <div className="flex flex-col gap-6 font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-relaxed text-[var(--color-bone)]">
          <p>
            I&apos;m Jaiye. I&apos;m 9 and I live in East Palo Alto, California. I love basketball, building stuff, my family, and Jesus.
          </p>
          <p>
            These are my games. I come up with the idea and the rules. I write the trivia and pick the players. Then me and my dad build it.
          </p>
          <p>
            Some games use AI to judge your answers. But I make the rules. New questions drop every week.
          </p>
          <p className="italic text-[var(--color-mute)] text-[1rem] leading-snug border-l-2 border-[var(--color-red)] pl-5 mt-2">
            &ldquo;Made by Jaiye Sobo, age 9. Built with my dad in East Palo Alto.&rdquo;
          </p>
          <p>
            Play them, send them to your friends, and tell me if a game is too easy. I&apos;ll make it harder.
          </p>
          <p>
            No ads. You can play without signing in. If you want to save your streak, sign in with your email.
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
