"use client";

import Link from "next/link";
import { formatCrosswordTime } from "@/lib/games/crossword-roasts";

type Props = {
  result: {
    time_ms: number;
    correct_cells: number;
    total_cells: number;
    perfect: boolean;
    tier: string;
    roast: string;
    title: string;
    streak?: { current_streak: number; longest_streak: number } | null;
  };
  onReplay: () => void;
};

export default function CrosswordResult({ result, onReplay }: Props) {
  const accent = result.perfect ? "text-[var(--color-red)]" : "text-[var(--color-warm-mute)]";

  return (
    <div className="max-w-[680px] mx-auto text-center py-12">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-4">
        Crossword · {result.title}
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em] mb-8">
        {result.perfect ? (
          <>
            Done.<span className="italic font-normal text-[var(--color-red)]">.</span>
          </>
        ) : (
          <>
            Close<span className="italic font-normal text-[var(--color-red)]">.</span>
          </>
        )}
      </h1>

      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.7vw,1.4rem)] leading-snug max-w-[42ch] mx-auto mb-10">
        &ldquo;{result.roast}&rdquo;
      </p>

      <div className="grid grid-cols-3 gap-4 max-w-[420px] mx-auto mb-10">
        <Stat label="Time" value={formatCrosswordTime(result.time_ms)} />
        <Stat
          label="Correct"
          value={`${result.correct_cells}/${result.total_cells}`}
          accent={accent}
        />
        <Stat
          label="Streak"
          value={result.streak ? `${result.streak.current_streak}` : "—"}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Play again →
        </button>
        <Link
          href="/games/crossword"
          className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          Pick another
        </Link>
        <Link
          href="/games"
          className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] self-center"
        >
          Back to games
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
        {label}
      </div>
      <div className={`font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tabular-nums ${accent ?? "text-[var(--color-bone)]"}`}>
        {value}
      </div>
    </div>
  );
}
