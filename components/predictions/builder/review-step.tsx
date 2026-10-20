"use client";

import { useEffect, useRef, useState } from "react";
import type { Missing } from "@/lib/nba/logic";
import type { PredictionPicks } from "@/lib/nba/types";
import PredictionView from "../prediction-view";
import type { StepId } from "./builder";
import { MonoLabel, StepIntro } from "./ui";

const STEP_NAME: Record<Missing["step"], string> = { playin: "Play-In", playoffs: "Playoffs", awards: "Awards" };

export default function ReviewStep({
  picks,
  season,
  ownerName,
  missing,
  go,
  flush,
  onPublished,
}: {
  picks: PredictionPicks;
  season: string;
  ownerName: string;
  missing: Missing[];
  go: (id: StepId) => void;
  flush: () => Promise<boolean>;
  onPublished: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = missing.length === 0;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      // Make sure the last change is saved before locking.
      const saved = await flush();
      if (!saved) throw new Error("save");
      const res = await fetch("/api/admin/predictions/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onPublished();
    } catch {
      setError("Couldn't publish. Check your picks and try again.");
      setBusy(false);
      setConfirming(false);
    }
  }

  const groups = (["playin", "playoffs", "awards"] as const)
    .map((step) => ({ step, items: missing.filter((m) => m.step === step) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <StepIntro title="Check your picks." accent="picks.">
        This is what everybody will see. Once you publish, no take backs. Ever.
      </StepIntro>

      <div className="mb-10 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/40 p-5">
        {ready ? (
          <p className="text-[1rem] text-[var(--color-bone)]">Every pick is in. You&apos;re ready. Let&apos;s go.</p>
        ) : (
          <>
            <p className="text-[1rem] text-[var(--color-bone)]">
              Still missing {missing.length} {missing.length === 1 ? "pick" : "picks"}:
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {groups.map((g) => (
                <div key={g.step}>
                  <div className="flex items-center justify-between gap-3">
                    <MonoLabel className="text-[var(--color-bone)]">{STEP_NAME[g.step]}</MonoLabel>
                    <button
                      type="button"
                      onClick={() => go(g.step)}
                      className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]"
                    >
                      Go fix
                    </button>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-[0.88rem] text-[var(--color-warm-mute)]">
                    {g.items.slice(0, 8).map((m) => (
                      <li key={m.label}>{m.label}</li>
                    ))}
                    {g.items.length > 8 ? <li>and {g.items.length - 8} more</li> : null}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="mt-6 flex flex-col items-start gap-2">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => setConfirming(true)}
            className="min-h-12 bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.75rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--color-red)]"
          >
            Publish my picks
          </button>
          {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
        </div>
      </div>

      <div className="border border-[var(--color-line)] bg-[var(--color-black)] px-4 py-10 md:px-8">
        <PredictionView picks={picks} season={season} ownerName={ownerName} publishedAt={null} />
      </div>

      {confirming ? (
        <ConfirmDialog busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => void publish()} />
      ) : null}
    </div>
  );
}

function ConfirmDialog({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] p-6"
      >
        <h2 id="publish-title" className="font-[family-name:var(--font-fraunces)] text-2xl font-black leading-tight tracking-[-0.02em]">
          Once you publish, your picks are locked forever. Ready?
        </h2>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-12 border border-[var(--color-line-strong)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)]"
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-12 bg-[var(--color-red)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] disabled:opacity-60"
          >
            {busy ? "Locking…" : "Publish my picks"}
          </button>
        </div>
      </div>
    </div>
  );
}
