"use client";

import { PICKS_PER_SIDE, type DraftPick } from "@/lib/draft-game";

type Props = {
  label: string;
  accent: string; // CSS color value (var or hex)
  picks: DraftPick[];
  isActive: boolean;
  isThinking?: boolean;
};

export default function RosterColumn({ label, accent, picks, isActive, isThinking }: Props) {
  const slots = Array.from({ length: PICKS_PER_SIDE }, (_, i) => picks[i] ?? null);

  return (
    <div
      className={`rounded p-4 border bg-[var(--color-card)] ${
        isActive ? "border-[var(--color-bone)]" : "border-[var(--color-line)]"
      }`}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em]"
          style={{ color: accent }}
        >
          {label}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {picks.length} / {PICKS_PER_SIDE}
        </div>
      </div>
      <ol className="flex flex-col gap-1.5">
        {slots.map((p, i) => (
          <li
            key={i}
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded ${
              p ? "bg-[var(--color-line)]/30" : "bg-transparent border border-dashed border-[var(--color-line)]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] w-5">
                {i + 1}
              </span>
              {p ? (
                <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] text-[var(--color-bone)] truncate">
                  {p.player_name}
                </span>
              ) : (
                <span className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-mute)]">
                  {isThinking && i === picks.length ? "thinking…" : "—"}
                </span>
              )}
            </div>
            {p && (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                {p.primary_position}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
