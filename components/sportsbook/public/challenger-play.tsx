"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SbItem, SbPick, SbPlayer } from "@/lib/sportsbook/types";
import { CardHead, CardPrompt, ResultLine, TeamDot, isLocked, isWinningOption } from "../card-parts";

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; code?: string }> {
  const res = await fetch("/api/sportsbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return { ok: res.ok, ...j };
}

const input = "h-12 w-full border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[1rem] text-[var(--color-bone)] placeholder:text-[var(--color-mute)] focus:border-[var(--color-red)] focus:outline-none";
const cta = "min-h-12 bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50";

export function JoinForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"join" | "restore">("join");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "join" ? await post({ action: "join", name }) : await post({ action: "restore", code });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    else router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-[420px] flex-col gap-3">
      {mode === "join" ? (
        <>
          <label htmlFor="sb-name" className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Your name or nickname
          </label>
          <input id="sb-name" className={input} value={name} maxLength={20} autoComplete="nickname" placeholder="Big Ticket" onChange={(e) => setName(e.target.value)} />
          <p className="text-[0.8rem] text-[var(--color-mute)]">This shows on the public leaderboard. First name or nickname only, please.</p>
        </>
      ) : (
        <>
          <label htmlFor="sb-code" className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Your player code
          </label>
          <input id="sb-code" className={input} value={code} maxLength={16} placeholder="HOOP-1234" autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
        </>
      )}
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
      <button type="submit" disabled={busy} className={cta}>
        {busy ? "One sec…" : mode === "join" ? "I'm in" : "Pick up where I left off"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "join" ? "restore" : "join");
          setError(null);
        }}
        className="text-[0.85rem] text-[var(--color-mute)] underline-offset-4 hover:underline"
      >
        {mode === "join" ? "Already playing? Use your code" : "New here? Join with a name"}
      </button>
    </form>
  );
}

export function PlayBoard({ me, items, picks, now, newCode }: { me: SbPlayer; items: SbItem[]; picks: SbPick[]; now: number; newCode?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const mine = (id: string) => picks.find((p) => p.item_id === id && p.player_id === me.id);
  const lockOn = picks.find((p) => p.player_id === me.id && p.is_lock)?.item_id ?? null;
  const done = items.filter((i) => {
    const p = mine(i.id);
    return p && (p.choice !== null || p.guess !== null);
  }).length;

  async function save(itemId: string, payload: Record<string, unknown>) {
    setSaving(itemId);
    setError(null);
    const res = await post({ action: "pick", item_id: itemId, ...payload });
    setSaving(null);
    if (!res.ok) setError(res.error ?? "Couldn't save that.");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-[family-name:var(--font-fraunces)] text-xl font-black">Playing as {me.display_name}</div>
          <div className="mt-1 text-[0.85rem] text-[var(--color-mute)]">
            {done} of {items.length} picked. Picks save as you tap and lock at tip-off.
          </div>
        </div>
        <div className={`font-[family-name:var(--font-jetbrains)] text-[0.75rem] ${newCode ? "text-[var(--color-games-yellow)]" : "text-[var(--color-mute)]"}`}>
          Your code: <span className="text-[var(--color-bone)]">{me.code}</span>
          <div className="text-[0.65rem]">Save it to play on another device.</div>
        </div>
      </div>
      {error ? <p className="mb-4 border border-[var(--color-red)] px-3 py-2 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <PlayCard key={item.id} item={item} pick={mine(item.id)} now={now} saving={saving === item.id} lockElsewhere={!!lockOn && lockOn !== item.id} onSave={(p) => save(item.id, p)} />
        ))}
      </div>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm("Forget this device? You can come back with your code.")) return;
          await post({ action: "leave" });
          router.refresh();
        }}
        className="mt-10 text-[0.8rem] text-[var(--color-mute)] underline-offset-4 hover:underline"
      >
        Not {me.display_name}? Switch player
      </button>
    </div>
  );
}

function PlayCard({
  item,
  pick,
  now,
  saving,
  lockElsewhere,
  onSave,
}: {
  item: SbItem;
  pick: SbPick | undefined;
  now: number;
  saving: boolean;
  lockElsewhere: boolean;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const locked = isLocked(item, now) || item.status !== "open";
  const picked = !!pick && (pick.choice !== null || pick.guess !== null);
  const [guess, setGuess] = useState(pick?.guess !== null && pick?.guess !== undefined ? String(pick.guess) : "");
  return (
    <div className={`flex flex-col border bg-[var(--color-off-black)] p-4 ${picked ? "border-[var(--color-line-hover)]" : "border-[var(--color-line-strong)]"}`}>
      <CardHead item={item} now={now} />
      <CardPrompt item={item} />
      <div className="mt-3 flex flex-col gap-1.5">
        {item.type === "closest" ? (
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            disabled={locked}
            value={guess}
            placeholder="Your guess"
            onChange={(e) => setGuess(e.target.value)}
            onBlur={() => {
              const n = guess.trim() === "" ? null : Number(guess);
              if (n !== (pick?.guess ?? null)) onSave({ guess: n });
            }}
            className={input}
          />
        ) : (
          item.options.map((o) => {
            const chosen = pick?.choice === o.key;
            const won = isWinningOption(item, o.key);
            return (
              <button
                key={o.key}
                type="button"
                disabled={locked}
                aria-pressed={chosen}
                onClick={() => !chosen && onSave({ choice: o.key })}
                className={`flex min-h-12 items-center gap-2 border px-3 text-left text-[0.92rem] transition-colors disabled:cursor-default ${
                  chosen ? "border-[var(--color-red)] bg-[var(--color-red)]/15" : "border-[var(--color-line-strong)] hover:border-[var(--color-line-hover)]"
                } ${locked && !chosen ? "opacity-50" : ""}`}
              >
                <TeamDot option={o} />
                <span className="min-w-0 flex-1">{o.label}</span>
                {won ? <span className="text-[var(--color-green)]">✓</span> : null}
              </button>
            );
          })
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {picked ? (
          <button
            type="button"
            disabled={locked || (lockElsewhere && !pick?.is_lock)}
            onClick={() => onSave({ is_lock: !pick?.is_lock })}
            className={`border px-2 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] disabled:opacity-40 ${
              pick?.is_lock ? "border-[var(--color-games-yellow)] text-[var(--color-games-yellow)]" : "border-[var(--color-line)] text-[var(--color-mute)]"
            }`}
          >
            {pick?.is_lock ? "★ Lock of the Week" : lockElsewhere ? "Lock used" : "☆ Make it my lock"}
          </button>
        ) : (
          <span />
        )}
        {saving ? <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-mute)]">Saving…</span> : null}
      </div>
      <ResultLine item={item} />
    </div>
  );
}
