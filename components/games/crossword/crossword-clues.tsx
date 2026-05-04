"use client";

import type { CrosswordPlacedWord } from "@/lib/games/crossword";

type Props = {
  placed: CrosswordPlacedWord[];
  activeWordIndex: number | null;
  onClueClick: (wordIndex: number) => void;
};

export default function CrosswordClues({ placed, activeWordIndex, onClueClick }: Props) {
  const across = placed
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.direction === "across")
    .sort((a, b) => a.p.number - b.p.number);
  const down = placed
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.direction === "down")
    .sort((a, b) => a.p.number - b.p.number);

  return (
    <div className="grid grid-cols-1 gap-6 text-sm">
      <ClueGroup
        label="Across"
        items={across}
        activeWordIndex={activeWordIndex}
        onClueClick={onClueClick}
      />
      <ClueGroup
        label="Down"
        items={down}
        activeWordIndex={activeWordIndex}
        onClueClick={onClueClick}
      />
    </div>
  );
}

function ClueGroup({
  label,
  items,
  activeWordIndex,
  onClueClick,
}: {
  label: string;
  items: { p: CrosswordPlacedWord; i: number }[];
  activeWordIndex: number | null;
  onClueClick: (wordIndex: number) => void;
}) {
  return (
    <section>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-3 pb-2 border-b border-[var(--color-line)]">
        {label}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map(({ p, i }) => {
          const active = i === activeWordIndex;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onClueClick(i)}
                className={`w-full text-left flex gap-3 items-baseline px-2 py-1.5 rounded-sm transition-colors ${
                  active
                    ? "bg-[var(--color-red)]/15 text-[var(--color-bone)]"
                    : "text-[var(--color-warm-bone)] hover:bg-[var(--color-warm-surface)]"
                }`}
              >
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-mute)] tabular-nums w-7 shrink-0">
                  {p.number}
                </span>
                <span className="font-[family-name:var(--font-fraunces)] leading-snug">
                  {p.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
