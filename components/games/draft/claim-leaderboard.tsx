"use client";

import { useState } from "react";

type Props = {
  playId: string;
  /** Already-known name from a prior claim (sets payload.player_names server-side
   *  at /start time). When set, we render a quiet "Tracked as X · change" line
   *  instead of the prompt. When null, we ask. */
  knownName: string | null;
};

type Phase = "idle" | "saving" | "saved" | "error";

export default function ClaimLeaderboard({ playId, knownName }: Props) {
  const [name, setName] = useState(knownName ?? "");
  const [tracked, setTracked] = useState(knownName);
  const [phase, setPhase] = useState<Phase>(knownName ? "saved" : "idle");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length > 0 && phase !== "saving";

  async function save() {
    if (!ready) return;
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === "claude") {
      setError("That name's taken. Try another.");
      return;
    }
    setPhase("saving");
    setError(null);
    try {
      const res = await fetch("/api/games/draft/claim-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId, player_name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "claim_failed");
      }
      setTracked(data.player_name);
      setName(data.player_name);
      setPhase("saved");
      setEditing(false);
    } catch (err) {
      console.error(err);
      setPhase("error");
      setError("Couldn't save. Try again in a sec.");
    }
  }

  // Already tracked, not editing — show the receipt
  if (tracked && !editing) {
    return (
      <div className="max-w-[760px] mx-auto px-6 mb-4">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-green)] flex flex-wrap items-center justify-center gap-3">
          <span>✓ Tracked on the leaderboard as {tracked}</span>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setPhase("idle");
            }}
            className="text-[var(--color-mute)] hover:text-[var(--color-bone)] underline transition-colors"
          >
            change name
          </button>
        </div>
      </div>
    );
  }

  // Asking for a name (or editing)
  return (
    <div className="max-w-[760px] mx-auto px-6 mb-6">
      <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)] mb-3">
          {tracked ? "Change leaderboard name" : "Track this on the leaderboard"}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            placeholder="Your name"
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-[var(--color-warm-bg,var(--color-black))] border border-[var(--color-line)] rounded px-4 py-3 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] text-[1rem] focus:outline-none focus:border-[var(--color-games-yellow)]"
          />
          <button
            type="button"
            onClick={save}
            disabled={!ready}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {phase === "saving" ? "Saving…" : tracked ? "Update" : "Track me"}
          </button>
          {tracked && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(tracked);
                setPhase("saved");
              }}
              className="text-[var(--color-mute)] hover:text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] transition-colors"
            >
              cancel
            </button>
          )}
        </div>
        {error && (
          <p className="mt-3 text-[0.85rem] italic font-[family-name:var(--font-fraunces)] text-[var(--color-red-bright)]">
            {error}
          </p>
        )}
        {!tracked && (
          <p className="mt-3 text-[0.8rem] text-[var(--color-mute)] leading-relaxed">
            We&apos;ll remember the name for next time. Skipping is fine — this match
            just won&apos;t show up on the record book.
          </p>
        )}
      </div>
    </div>
  );
}
