"use client";

import { ROSTER_SIZE, SLOT_LABELS, type RosterPick } from "@/lib/goat-roster";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  picks: RosterPick[];
  onRemove: (player_id: string) => void;
  onClear: () => void;
  balanced: boolean;
};

export default function LineupRow({ team, picks, onRemove, onClear, balanced }: Props) {
  const slots = Array.from({ length: ROSTER_SIZE }, (_, i) => picks[i] ?? null);

  return (
    <div className="rounded p-4 sm:p-5 border border-[var(--color-line)] bg-[var(--color-card)]" style={{ borderTop: `3px solid ${team.primary_color}` }}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)]">
          Your starting 5 + 6th man
        </div>
        <div className="flex items-center gap-3">
          {picks.length > 0 && (
            <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] ${balanced ? "text-[var(--color-games-green)]" : "text-[var(--color-mute)]"}`}>
              {balanced ? "✓ G/F/C balance" : "no G/F/C balance"}
            </span>
          )}
          {picks.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {slots.map((p, i) => {
          const isSixthMan = i === ROSTER_SIZE - 1;
          return (
          <button
            key={i}
            type="button"
            onClick={() => p && onRemove(p.player_id)}
            disabled={!p}
            className={`flex flex-col gap-1 px-3 py-3 rounded text-left min-h-[88px] transition-colors ${
              p
                ? "bg-[var(--color-line)]/30 border border-[var(--color-line-strong)] hover:border-[var(--color-red)]"
                : isSixthMan
                ? "border border-dashed border-[var(--color-games-yellow)]/60 bg-transparent"
                : "border border-dashed border-[var(--color-line)] bg-transparent"
            }`}
          >
            <span
              className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]"
              style={{ color: isSixthMan ? "var(--color-games-yellow)" : "var(--color-mute)" }}
            >
              {SLOT_LABELS[i]}
            </span>
            {p ? (
              <>
                <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] text-[var(--color-bone)] leading-tight">
                  {p.player_name}
                </span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mt-auto">
                  {p.primary_position} · tap to remove
                </span>
              </>
            ) : (
              <span className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-mute)] my-auto">
                empty
              </span>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}
