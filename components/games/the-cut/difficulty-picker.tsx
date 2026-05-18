"use client";

import { useState } from "react";
import type { CutGameMode } from "@/lib/games/the-cut";

type Props = {
  onStart: (mode: CutGameMode) => void;
  busy?: boolean;
};

const OPTIONS: { mode: CutGameMode; title: string; description: string; tag: string }[] = [
  {
    mode: "easy",
    title: "Easy",
    description: "The criterion is shown. You see what connects the keeps.",
    tag: "Criterion visible",
  },
  {
    mode: "hard",
    title: "Hard",
    description: "Four belong together. Figure out why with no help.",
    tag: "Criterion hidden",
  },
];

export default function DifficultyPicker({ onStart, busy = false }: Props) {
  const [selected, setSelected] = useState<CutGameMode | null>(null);

  return (
    <section className="px-6 lg:px-10 pt-20 pb-24 max-w-[920px] mx-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
        jaiyesobo.com / games / the cut
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.9] tracking-[-0.04em] mb-6">
        The <span className="italic font-normal text-[var(--color-red)]">Cut.</span>
      </h1>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.35rem)] text-[var(--color-bone)] max-w-[48ch] leading-snug mb-10">
        Eight players. Four belong together. Four don&apos;t. Keep four. Cut four. Don&apos;t blink.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setSelected(opt.mode)}
              className={`text-left bg-[var(--color-card)] border rounded p-6 transition-all ${
                isSelected
                  ? "border-[var(--color-red)] -translate-y-0.5"
                  : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:-translate-y-0.5"
              }`}
              style={isSelected ? { borderLeft: "3px solid var(--color-red)" } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em]"
                  style={{
                    color: isSelected ? "var(--color-red)" : "var(--color-mute)",
                  }}
                >
                  {opt.tag}
                </span>
                {isSelected && (
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                    ✓ Selected
                  </span>
                )}
              </div>
              <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.7rem] leading-tight tracking-tight mb-2">
                {opt.title}
              </h3>
              <p className="text-[var(--color-mute)] text-sm leading-relaxed">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => selected && onStart(selected)}
        disabled={!selected || busy}
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Loading…" : "Start the cut →"}
      </button>
    </section>
  );
}
