"use client";

import { TEAMS } from "@/lib/nba/teams";
import type { Slot } from "@/lib/nba/logic";
import { TeamChip } from "../team-tile";

/** A team you can tap to pick as the winner. */
export default function PickButton({
  slot,
  picked,
  decided,
  onPick,
  compact = false,
}: {
  slot: Slot;
  picked: boolean;
  /** Someone in this matchup is picked, so the other team dims. */
  decided: boolean;
  onPick: () => void;
  compact?: boolean;
}) {
  if (!slot) {
    return (
      <div
        className={`flex items-center gap-2 border border-dashed border-[var(--color-line-strong)] px-2 text-[0.8rem] text-[var(--color-warm-dim)] ${
          compact ? "h-11" : "h-14"
        }`}
      >
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em]">TBD</span>
      </div>
    );
  }
  const t = TEAMS[slot.code];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`flex w-full items-center gap-2 border px-2 text-left transition-colors ${compact ? "h-11" : "h-14"} ${
        picked
          ? "border-[var(--color-red)] bg-[var(--color-red)]/12"
          : `border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] hover:border-[var(--color-warm-mute)] ${
              decided ? "opacity-50" : ""
            }`
      }`}
    >
      <span className="w-4 shrink-0 text-right font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-mute)]">
        {slot.seed}
      </span>
      <TeamChip code={slot.code} />
      <span className={`min-w-0 flex-1 truncate font-medium ${compact ? "text-[0.78rem]" : "text-[0.9rem]"}`}>{t.name}</span>
      {picked ? (
        <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-red)]" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  );
}
