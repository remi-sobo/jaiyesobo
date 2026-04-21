"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GRACE_MS = 10 * 60 * 1000;

type Props = { taskId: string; completedAt: string };

export default function UndoButton({ taskId, completedAt }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(
    Date.now() - new Date(completedAt).getTime() > GRACE_MS
  );

  useEffect(() => {
    if (expired) return;
    const age = Date.now() - new Date(completedAt).getTime();
    const timeLeft = GRACE_MS - age;
    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }
    const t = setTimeout(() => setExpired(true), timeLeft);
    return () => clearTimeout(t);
  }, [completedAt, expired]);

  if (expired) return null;

  async function confirmUndo() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/completions/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (payload?.error === "grace_expired") {
          setError("Ask Dad to undo this one — it's been a while.");
          setExpired(true);
          return;
        }
        setError("Couldn't undo. Try again.");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-dim)] hover:text-[var(--color-red)] transition-colors px-2 py-1"
      >
        Undo
      </button>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[rgba(15,14,12,0.86)] backdrop-blur-sm"
          onClick={() => !busy && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6"
          >
            <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-xl leading-snug tracking-[-0.01em] mb-2">
              Undo this?
            </h3>
            <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mb-6">
              The task will go back to not-done. Your photo and reflection are saved — if you send
              it again, they&apos;re still there.
            </p>
            {error && (
              <p className="text-sm text-[var(--color-red-soft)] italic mb-4 font-[family-name:var(--font-fraunces)]">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUndo}
                disabled={busy}
                className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-5 py-2.5 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 transition-colors"
              >
                {busy ? "…" : "Yes, undo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
