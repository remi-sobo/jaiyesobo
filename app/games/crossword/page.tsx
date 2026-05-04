import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import { getPlayableCrosswords } from "@/lib/games/crossword-data";

export const metadata: Metadata = {
  title: "Crossword — Jaiye's Games",
  description: "Themed NBA crosswords built from word packs.",
};

export const dynamic = "force-dynamic";

export default async function CrosswordIndex() {
  const packs = await getPlayableCrosswords();

  return (
    <GameShell liveLabel="Themed NBA crosswords">
      <section className="px-6 lg:px-10 pt-28 pb-10 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
          jaiyesobo.com / games / crossword
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.04em] mb-6">
          Cross<span className="italic font-normal text-[var(--color-red)]">word.</span>
        </h1>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.35rem)] leading-snug max-w-[44ch] mb-2">
          Themed crossword puzzles. Same packs as Word Search, different game.
        </p>
      </section>

      <section className="px-6 lg:px-10 pb-24 max-w-[1100px] mx-auto">
        {packs.length === 0 ? (
          <div className="border border-dashed border-[var(--color-line)] rounded p-10 text-center text-[var(--color-warm-mute)]">
            No crosswords yet. Curators: open a verified word pack and click
            <span className="text-[var(--color-bone)]"> Generate crossword</span> to bring one online.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/games/crossword/${encodeURIComponent(p.payload.theme_slug)}`}
                  className="block bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-line-strong)] transition-colors"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
                    {p.payload.difficulty} · {p.payload.crossword_grid?.placed.length ?? 0} clues
                  </div>
                  <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-tight tracking-tight mb-1">
                    {p.payload.title}
                  </div>
                  {p.payload.subtitle && (
                    <div className="text-[var(--color-warm-mute)] text-sm leading-snug">
                      {p.payload.subtitle}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </GameShell>
  );
}
