"use client";

import { useMemo, useState } from "react";
import type { RosterPlayer } from "@/lib/goat-roster";

type PositionFilter = "all" | "G" | "F" | "C";

type Props = {
  pool: RosterPlayer[];
  pickedIds: Set<string>;
  onAdd: (player: RosterPlayer) => void;
  disabled: boolean; // true when roster is full
};

export default function PlayerPool({ pool, pickedIds, onAdd, disabled }: Props) {
  const [position, setPosition] = useState<PositionFilter>("all");
  const [iconicOnly, setIconicOnly] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((p) => {
        if (position !== "all" && p.primary_position !== position) {
          // Allow secondary positions to count as a partial match
          if (!p.secondary_positions.includes(position)) return false;
        }
        if (iconicOnly && !p.team_stint.is_iconic) return false;
        if (q.length > 0) {
          const hay = [p.name, ...(p.secondary_positions || [])].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Iconic first, then alphabetical
        if (a.team_stint.is_iconic !== b.team_stint.is_iconic) {
          return a.team_stint.is_iconic ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [pool, position, iconicOnly, query]);

  return (
    <div>
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <PositionChip label="All" active={position === "all"} onClick={() => setPosition("all")} />
        <PositionChip label="Guards" active={position === "G"} onClick={() => setPosition("G")} />
        <PositionChip label="Forwards" active={position === "F"} onClick={() => setPosition("F")} />
        <PositionChip label="Centers" active={position === "C"} onClick={() => setPosition("C")} />
        <button
          type="button"
          onClick={() => setIconicOnly((v) => !v)}
          className={`px-3 py-1.5 rounded-full font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] transition-colors border ${
            iconicOnly
              ? "bg-[var(--color-games-yellow)] text-[var(--color-black)] border-[var(--color-games-yellow)]"
              : "bg-transparent text-[var(--color-mute)] border-[var(--color-line)] hover:border-[var(--color-bone)] hover:text-[var(--color-bone)]"
          }`}
        >
          ★ Iconic only
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          className="ml-auto bg-[var(--color-card)] border border-[var(--color-line)] rounded px-3 py-1.5 text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] focus:outline-none focus:border-[var(--color-games-yellow)] min-w-0"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center font-[family-name:var(--font-fraunces)] italic text-[var(--color-mute)] border border-dashed border-[var(--color-line)] rounded">
          No players match. Loosen the filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((p) => {
            const isPicked = pickedIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onAdd(p)}
                disabled={isPicked || disabled}
                className={`group text-left flex flex-col gap-1 px-4 py-3 rounded border transition-colors ${
                  isPicked
                    ? "border-[var(--color-games-green)] bg-[rgba(62,207,178,0.08)] opacity-60 cursor-default"
                    : disabled
                    ? "border-[var(--color-line)] bg-[var(--color-card)] opacity-40 cursor-not-allowed"
                    : "border-[var(--color-line)] bg-[var(--color-card)] hover:border-[var(--color-games-yellow)] hover:bg-[rgba(245,200,66,0.04)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[1rem] text-[var(--color-bone)] leading-tight">
                    {p.name}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] whitespace-nowrap">
                    {p.primary_position}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
                    {p.team_stint.years}
                  </span>
                  {p.team_stint.is_iconic && (
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)]">
                      ★ iconic
                    </span>
                  )}
                  {isPicked && (
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-green)]">
                      ✓ picked
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PositionChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] transition-colors border ${
        active
          ? "bg-[var(--color-bone)] text-[var(--color-black)] border-[var(--color-bone)]"
          : "bg-transparent text-[var(--color-mute)] border-[var(--color-line)] hover:border-[var(--color-bone)] hover:text-[var(--color-bone)]"
      }`}
    >
      {label}
    </button>
  );
}
