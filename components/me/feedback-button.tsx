"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "open" | "sending" | "sent" | "error";
type Kind = "bug" | "idea" | "unsure" | null;

export default function FeedbackButton() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Hide on lock screen
  const hidden = pathname?.startsWith("/me/lock");

  const close = useCallback(() => {
    setPhase("idle");
    setText("");
    setKind(null);
  }, []);

  useEffect(() => {
    if (phase !== "open" && phase !== "error") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, close]);

  async function send() {
    if (text.trim().length === 0) return;
    setPhase("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text.trim(),
          kind,
          page_url: typeof window !== "undefined" ? window.location.href : null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setPhase("sent");
      setToast("Dad got it. Thanks for telling him.");
      setText("");
      setKind(null);
      setTimeout(() => {
        setPhase("idle");
        setTimeout(() => setToast(null), 400);
      }, 2600);
    } catch {
      setPhase("error");
    }
  }

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("open")}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-line-strong)] bg-[rgba(15,14,12,0.85)] backdrop-blur-sm text-[var(--color-warm-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-colors shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)]"
        aria-label="Report a bug or share an idea"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" aria-hidden />
        <span className="hidden sm:inline">Something off?</span>
      </button>

      {toast && phase !== "open" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-5 z-40 bg-[var(--color-warm-surface-2)] border border-[var(--color-line-strong)] border-l-[3px] border-l-[var(--color-green)] rounded px-4 py-3 text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] max-w-[300px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] animate-[pin-shake_0s]"
        >
          {toast}
        </div>
      )}

      {(phase === "open" || phase === "sending" || phase === "error") && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-[rgba(15,14,12,0.86)] backdrop-blur-sm"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-7 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl leading-snug tracking-[-0.01em] mb-1">
                  Tell Dad what&apos;s <span className="italic font-normal text-[var(--color-red)]">up.</span>
                </h2>
                <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed">
                  Bug, idea, or just weird — whatever you noticed.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] text-xl leading-none -mt-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened? What page were you on? What were you trying to do?"
              rows={5}
              disabled={phase === "sending"}
              maxLength={2000}
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[0.95rem] leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] font-[family-name:var(--font-fraunces)] italic focus:outline-none focus:border-[var(--color-red)] resize-y"
            />

            <fieldset className="mt-5 flex flex-wrap gap-2" disabled={phase === "sending"}>
              <legend className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2 w-full">
                What kind? <span className="normal-case tracking-normal text-[var(--color-warm-dim)] ml-1">optional</span>
              </legend>
              {KIND_OPTIONS.map((opt) => {
                const active = kind === opt.value;
                return (
                  <button
                    key={opt.value ?? "none"}
                    type="button"
                    onClick={() => setKind(active ? null : opt.value)}
                    className={`px-3 py-1.5 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] border transition-colors ${
                      active
                        ? opt.value === "bug"
                          ? "bg-[var(--color-red)] border-[var(--color-red)] text-[var(--color-bone)]"
                          : opt.value === "idea"
                          ? "bg-[var(--color-amber)] border-[var(--color-amber)] text-[var(--color-warm-bg)]"
                          : "bg-[var(--color-warm-surface-3)] border-[var(--color-line-strong)] text-[var(--color-bone)]"
                        : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </fieldset>

            {phase === "error" && (
              <p className="mt-4 text-sm text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
                Couldn&apos;t send. Tell Dad the old-fashioned way.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={close}
                disabled={phase === "sending"}
                className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-3 text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={text.trim().length === 0 || phase === "sending"}
                className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === "sending" ? "Sending…" : "Send to Dad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "bug", label: "Something broke" },
  { value: "idea", label: "I have an idea" },
  { value: "unsure", label: "Not sure" },
];
