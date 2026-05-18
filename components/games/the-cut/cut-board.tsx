"use client";

import { REQUIRED_KEEPS } from "@/lib/games/the-cut";

type Props = {
  items: { name: string }[];
  /** Ordered list of selected names (oldest first). Used for deselect-oldest. */
  selected: string[];
  onToggle: (name: string) => void;
  onLock: () => void;
  busy: boolean;
};

export default function CutBoard({ items, selected, onToggle, onLock, busy }: Props) {
  const count = selected.length;
  const fullyChosen = count === REQUIRED_KEEPS;

  return (
    <section className="px-6 lg:px-10 pb-12 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
          {count} of {REQUIRED_KEEPS} selected
        </div>
        <div className="flex gap-1">
          {Array.from({ length: REQUIRED_KEEPS }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < count ? "bg-[var(--color-red)]" : "bg-[var(--color-line-strong)]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {items.map((item) => {
          const isSelected = selected.includes(item.name);
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onToggle(item.name)}
              disabled={busy}
              className={`relative h-[120px] sm:h-[140px] lg:h-[150px] rounded p-4 sm:p-5 text-left transition-all bg-[var(--color-card)] ${
                isSelected
                  ? "border-2 border-[var(--color-red)] scale-[1.03] shadow-[0_0_0_4px_rgba(230,57,70,0.15)]"
                  : "border border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:-translate-y-0.5"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-red)] text-[var(--color-bone)] flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
              <div className="h-full flex items-end">
                <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.05rem,2.2vw,1.4rem)] leading-[1.05] tracking-tight text-[var(--color-bone)]">
                  {item.name}
                </h3>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onLock}
          disabled={!fullyChosen || busy}
          className={`font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-8 py-4 rounded-sm transition-colors disabled:cursor-not-allowed ${
            fullyChosen
              ? "bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-bright)]"
              : "bg-[var(--color-card)] text-[var(--color-mute)] border border-[var(--color-line)] disabled:opacity-50"
          }`}
        >
          {busy ? "Locking…" : fullyChosen ? "Lock my cut →" : `Pick ${REQUIRED_KEEPS - count} more`}
        </button>
      </div>
    </section>
  );
}
