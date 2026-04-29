import Link from "next/link";
import type { Game } from "@/lib/games/data";

type Props = { game: Game; number: string };

export default function GameCard({ game, number }: Props) {
  const isLive = game.status === "live";
  const isBeta = game.status === "beta";
  const inner = (
    <div
      className={`relative h-full p-7 rounded border transition-all overflow-hidden ${
        isLive
          ? "bg-[var(--color-card)] border-[var(--color-line)] hover:border-[var(--color-games-yellow)] hover:-translate-y-0.5"
          : "bg-[var(--color-off-black)] border-[var(--color-line)] opacity-70"
      }`}
    >
      {isLive && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-games-yellow)] animate-pulse" />
          Live
        </span>
      )}
      {isBeta && (
        <span className="absolute top-4 right-4 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          Coming this month
        </span>
      )}

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-6">
        {number} / {game.slug.toUpperCase()}
      </div>

      <h3 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.75rem,3vw,2.5rem)] leading-[0.95] tracking-tight mb-3">
        {game.title}
      </h3>

      <p className="text-[var(--color-mute)] text-[0.95rem] leading-relaxed max-w-[36ch]">
        {game.description}
      </p>

      {isLive && (
        <div className="mt-6 inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
          Play <span className="text-base">↗</span>
        </div>
      )}
    </div>
  );

  if (!isLive) return <div className="cursor-not-allowed">{inner}</div>;
  return (
    <Link href={`/games/${game.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
