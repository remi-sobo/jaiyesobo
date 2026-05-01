"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchPool, type SearchHit } from "@/lib/draft-search";
import type { DraftPoolPlayer } from "@/lib/draft-game";

type Props = {
  pool: DraftPoolPlayer[];
  excludeIds: Set<string>;
  disabled: boolean;
  onPick: (player_id: string) => Promise<void>;
  onFailedSearch: (query: string) => void;
};

export default function PickInput({ pool, excludeIds, disabled, onPick, onFailedSearch }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const failedRef = useRef<Set<string>>(new Set());

  const hits: SearchHit[] = useMemo(
    () => searchPool(pool, query, excludeIds, 6),
    [pool, query, excludeIds]
  );

  // Reset active selection when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Log failed searches (3+ chars, no hits, not yet logged)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    if (hits.length > 0) return;
    if (failedRef.current.has(q.toLowerCase())) return;
    failedRef.current.add(q.toLowerCase());
    const t = setTimeout(() => onFailedSearch(q), 800);
    return () => clearTimeout(t);
  }, [query, hits.length, onFailedSearch]);

  // Auto-focus when enabled
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  async function commit(playerId: string) {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(playerId);
      setQuery("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Pick failed.");
    } finally {
      setBusy(false);
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

  return (
    <div className="flex flex-col gap-2">
      <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)]">
        Your turn — type a player&apos;s name
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || busy}
          placeholder="e.g. Magic, Mamba, Worthy..."
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
        {query.trim().length >= 2 && hits.length === 0 && !disabled && (
          <div className="absolute left-0 right-0 mt-1 z-20 bg-[var(--color-card)] border border-[var(--color-line)] rounded px-4 py-3 text-[0.8rem] text-[var(--color-mute)] italic font-[family-name:var(--font-fraunces)]">
            No match in this team&apos;s pool. Try another name.
          </div>
        )}
      </div>
      {error && (
        <p className="text-[0.85rem] text-[var(--color-red-bright)] italic font-[family-name:var(--font-fraunces)]">
          {error}
        </p>
      )}
    </div>
  );
}
