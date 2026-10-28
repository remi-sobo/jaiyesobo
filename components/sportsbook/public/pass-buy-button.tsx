"use client";

import { useEffect, useState } from "react";

const cta =
  "inline-flex min-h-12 items-center justify-center bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50";

/** Starts Stripe Checkout for the Season Pass: ask the server for a link, then go there. */
export function PassBuyButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back with the browser's back button restores this page as it was, button stuck and all.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { url?: string; already?: boolean; error?: string };
      if (res.ok && j.already) return window.location.reload();
      if (res.ok && j.url) return window.location.assign(j.url);
      setError(j.error ?? "Couldn't start checkout.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" disabled={busy} className={cta} onClick={buy}>
        {busy ? "One moment…" : "Get the Season Pass"}
      </button>
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
    </div>
  );
}
