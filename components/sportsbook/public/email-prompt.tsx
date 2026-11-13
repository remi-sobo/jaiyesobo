"use client";

import { useState, useSyncExternalStore } from "react";
import { subscribeEmail, subscribedMessage } from "@/components/site/email-api";

const KEY = "rib_email_prompt_dismissed";

/**
 * A small line for a signed in player who has no email on file: "Never miss
 * your results." with an inline form. Dismissible; the choice is remembered in
 * this browser only.
 */
export function EmailPrompt({ className = "" }: { className?: string }) {
  // Hidden on the server and during hydration, then read from this browser's storage.
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(KEY) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const hidden = stored || dismissed;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (hidden) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await subscribeEmail({ email, results: true, newsletter: true, source: "week" });
    setBusy(false);
    if (r.ok) setDone(subscribedMessage(r.status));
    else setError(r.error);
  }

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* no storage: it just comes back next visit */
    }
    setDismissed(true);
  }

  return (
    <div className={`border border-[var(--color-line-strong)] px-4 py-3 ${className}`}>
      {done ? (
        <p className="text-[0.95rem]">{done}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label htmlFor="email-prompt" className="text-[0.95rem]">
            Never miss your results. Add your email.
          </label>
          <input
            id="email-prompt"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 min-w-[200px] flex-1 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[0.95rem] text-[var(--color-bone)] placeholder:text-[var(--color-mute)] focus:border-[var(--color-red)] focus:outline-none"
          />
          <button type="submit" disabled={busy} className="min-h-10 bg-[var(--color-red)] px-4 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50">
            {busy ? "One sec…" : "Send my results"}
          </button>
          <button type="button" onClick={dismiss} className="min-h-10 px-2 text-[0.85rem] text-[var(--color-mute)] underline-offset-4 hover:underline">
            Not now
          </button>
          {error ? <p className="w-full text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
