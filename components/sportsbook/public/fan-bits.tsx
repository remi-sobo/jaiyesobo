"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REACTIONS, type ReactionKey } from "@/lib/sportsbook/reactions";

async function post(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch("/api/sportsbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return null;
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  return j.error ?? "Something went wrong.";
}

/** Emoji row under a revealed pick. Tap to add, tap again to take it back. */
export function ReactionBar({
  itemId,
  playerId,
  counts,
  mine,
}: {
  itemId: string;
  playerId: string;
  counts: Partial<Record<ReactionKey, number>>;
  mine: ReactionKey[];
}) {
  const router = useRouter();
  const [local, setLocal] = useState({ counts, mine });
  const [busy, setBusy] = useState(false);

  async function toggle(key: ReactionKey) {
    if (busy) return;
    setBusy(true);
    const on = local.mine.includes(key);
    // Optimistic, then the server is the source of truth.
    setLocal({
      counts: { ...local.counts, [key]: Math.max(0, (local.counts[key] ?? 0) + (on ? -1 : 1)) },
      mine: on ? local.mine.filter((k) => k !== key) : [...local.mine, key],
    });
    const err = await post({ action: "react", item_id: itemId, player_id: playerId, emoji: key });
    setBusy(false);
    if (err) setLocal({ counts, mine });
    else router.refresh();
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {REACTIONS.map((r) => {
        const n = local.counts[r.key] ?? 0;
        const on = local.mine.includes(r.key);
        return (
          <button
            key={r.key}
            type="button"
            aria-label={`${r.label}${n ? `, ${n}` : ""}`}
            aria-pressed={on}
            onClick={() => toggle(r.key)}
            className={`flex h-7 items-center gap-1 rounded-full border px-2 text-[0.8rem] transition-colors ${
              on ? "border-[var(--color-red)] bg-[var(--color-red)]/15" : "border-[var(--color-line)] hover:border-[var(--color-line-hover)]"
            }`}
          >
            <span aria-hidden>{r.emoji}</span>
            {n ? <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem]">{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Who wins this week? Fans vote, everyone sees the split. */
export function FanVote({
  weekId,
  open,
  tally,
}: {
  weekId: string;
  open: boolean;
  tally: { jaiye: number; remi: number; mine: "jaiye" | "remi" | null };
}) {
  const router = useRouter();
  const [state, setState] = useState(tally);
  const [error, setError] = useState<string | null>(null);
  const total = state.jaiye + state.remi;
  const pctJ = total ? Math.round((state.jaiye / total) * 100) : 50;

  async function vote(choice: "jaiye" | "remi") {
    if (state.mine === choice) return;
    const next = {
      jaiye: state.jaiye + (choice === "jaiye" ? 1 : 0) - (state.mine === "jaiye" ? 1 : 0),
      remi: state.remi + (choice === "remi" ? 1 : 0) - (state.mine === "remi" ? 1 : 0),
      mine: choice,
    };
    setState(next);
    const err = await post({ action: "vote", week_id: weekId, choice });
    if (err) {
      setError(err);
      setState(tally);
    } else router.refresh();
  }

  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
        Who you got this week?
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["jaiye", "remi"] as const).map((c) => (
          <button
            key={c}
            type="button"
            disabled={!open}
            aria-pressed={state.mine === c}
            onClick={() => vote(c)}
            className={`min-h-12 border font-[family-name:var(--font-fraunces)] text-lg font-black transition-colors disabled:cursor-default ${
              state.mine === c ? "border-[var(--color-red)] bg-[var(--color-red)]/15" : "border-[var(--color-line-strong)] hover:border-[var(--color-line-hover)]"
            }`}
          >
            {c === "jaiye" ? "Jaiye" : "Remi"}
          </button>
        ))}
      </div>
      <div className="mt-3 flex h-2 overflow-hidden bg-[var(--color-line-strong)]" aria-hidden>
        <div className="bg-[var(--color-red)]" style={{ width: `${pctJ}%` }} />
        <div className="flex-1 bg-[var(--color-bone)]" />
      </div>
      <div className="mt-1.5 flex justify-between font-[family-name:var(--font-jetbrains)] text-[0.7rem]">
        <span>Jaiye {total ? `${pctJ}%` : ""}</span>
        <span className="text-[var(--color-mute)]">{total} {total === 1 ? "vote" : "votes"}</span>
        <span>{total ? `${100 - pctJ}%` : ""} Remi</span>
      </div>
      {error ? <p className="mt-2 text-[0.8rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {!open ? <p className="mt-2 text-[0.8rem] text-[var(--color-mute)]">Voting is over for this week.</p> : null}
    </div>
  );
}
