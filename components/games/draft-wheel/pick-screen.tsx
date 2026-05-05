"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchPool, type SearchHit } from "@/lib/draft-search";
import type { DraftPoolPlayer } from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";
import type { WheelSlot } from "@/lib/games/draft-wheel";

type Props = {
  /** Player who's currently picking. */
  playerName: string;
  /** Slot they're filling (G1, G2, F1, F2, C). */
  slot: WheelSlot;
  position: "G" | "F" | "C";
  /** The team the wheel handed them. */
  team: DraftTeamPayload;
  /** Was this the result of a re-roll? Affects the headline copy. */
  rerolled: boolean;
  /** Eligible pool — just this team at this position, minus already-picked. */
  pool: DraftPoolPlayer[];
  /** True if the player still has their re-roll token. */
  rerollAvailable: boolean;
  onPick: (player_id: string) => Promise<void>;
  onReroll: () => Promise<void>;
};

/**
 * Active-turn pick screen. Shows the team they got, autocomplete picker
 * scoped to that team's pool, and a re-roll button that's only enabled when
 * the player still has their token. Once a pick is committed, parent flips
 * phase — this component doesn't manage state across rounds.
 */
export default function PickScreen({
  playerName,
  slot,
  position,
  team,
  rerolled,
  pool,
  rerollAvailable,
  onPick,
  onReroll,
}: Props) {
  const [query, setQuery] = useState("");
  const [prevQuery, setPrevQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerollBusy, setRerollBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits: SearchHit[] = useMemo(
    () => searchPool(pool, query, new Set(), 6),
    [pool, query]
  );

  // Reset highlighted hit when the query changes — done during render rather
  // than in an effect, per React 19 best practice (no synchronous setState in effects).
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveIndex(0);
  }
  useEffect(() => {
    inputRef.current?.focus();
  }, [team.abbreviation]);

  async function commit(playerId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(playerId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Pick failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reroll() {
    if (!rerollAvailable || rerollBusy || busy) return;
    setRerollBusy(true);
    setError(null);
    try {
      await onReroll();
      setQuery("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Re-roll failed.");
    } finally {
      setRerollBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) void commit(hit.id);
    }
  }

  const empty = pool.length === 0;

  return (
    <div className="max-w-[720px] mx-auto px-6 pt-12 pb-20">
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-4"
        style={{ color: team.primary_color }}
      >
        {playerName} · {slot} · pick {positionLabel(position)}
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] tracking-[-0.02em] mb-3">
        {rerolled ? "Re-rolled to " : "You got the "}
        <span className="italic font-normal text-[var(--color-red)]">
          {team.city} {team.name}
          <span className="text-[var(--color-bone)]">.</span>
        </span>
      </h1>
      <p className="text-[var(--color-mute)] mb-2">
        Pick the best <span className="text-[var(--color-bone)]">{positionLabel(position)}</span>{" "}
        from their all-time pool.
      </p>
      <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-8">
        {pool.length} eligible
      </p>

      {empty ? (
        <div className="p-8 border border-dashed border-[var(--color-line)] rounded text-[var(--color-mute)] mb-6">
          No verified {positionLabel(position).toLowerCase()}s available for this team.{" "}
          {rerollAvailable ? "Use your re-roll." : "Locking an empty slot — judge will dock you."}
        </div>
      ) : (
        <div className="relative mb-6">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy || rerollBusy}
            placeholder={`Type a ${positionLabel(position).toLowerCase()}'s name…`}
            maxLength={60}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-[var(--color-card)] border border-[var(--color-line)] rounded px-4 py-4 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] text-[1.1rem] focus:outline-none focus:border-[var(--color-games-yellow)] disabled:opacity-50"
          />
          {hits.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 z-20 bg-[var(--color-card)] border border-[var(--color-line)] rounded shadow-lg max-h-[320px] overflow-y-auto">
              {hits.map((h, i) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => commit(h.id)}
                    onMouseEnter={() => setActiveIndex(i)}
                    disabled={busy}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      i === activeIndex
                        ? "bg-[var(--color-games-yellow)] text-[var(--color-black)]"
                        : "text-[var(--color-bone)] hover:bg-[var(--color-line)]"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[1rem] leading-tight">
                        {h.name}
                      </span>
                      {h.reason && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] opacity-70">
                          {h.reason}
                        </span>
                      )}
                    </div>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] opacity-60 whitespace-nowrap">
                      {h.primary_position} · {h.team_stint_years}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && hits.length === 0 && (
            <div className="absolute left-0 right-0 mt-1 z-20 bg-[var(--color-card)] border border-[var(--color-line)] rounded px-4 py-3 text-[0.8rem] text-[var(--color-mute)] italic font-[family-name:var(--font-fraunces)]">
              No match in this team&apos;s {positionLabel(position).toLowerCase()} pool.
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mb-4 text-[0.85rem] text-[var(--color-red-bright)] italic font-[family-name:var(--font-fraunces)]">
          {error}
        </p>
      )}

      <div className="border-t border-[var(--color-line)] pt-6">
        <RerollPill
          available={rerollAvailable}
          busy={rerollBusy}
          onClick={reroll}
          rerolled={rerolled}
        />
      </div>
    </div>
  );
}

function RerollPill({
  available,
  busy,
  onClick,
  rerolled,
}: {
  available: boolean;
  busy: boolean;
  onClick: () => void;
  rerolled: boolean;
}) {
  if (rerolled) {
    return (
      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
        Re-roll used this round · No backsies
      </p>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={!available || busy}
        className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-3 rounded-sm border transition-colors ${
          available
            ? "border-[var(--color-games-yellow)] text-[var(--color-games-yellow)] hover:bg-[var(--color-games-yellow)] hover:text-[var(--color-black)]"
            : "border-[var(--color-line)] text-[var(--color-mute)] opacity-50 cursor-not-allowed"
        }`}
      >
        {busy ? "Re-rolling…" : available ? "Don't like this team? Re-roll" : "Re-roll already used"}
      </button>
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
        {available ? "1 left · once per game" : "0 left"}
      </span>
    </div>
  );
}

function positionLabel(p: "G" | "F" | "C"): string {
  if (p === "G") return "Guard";
  if (p === "F") return "Forward";
  return "Center";
}
