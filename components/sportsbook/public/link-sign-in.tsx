"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const cta =
  "min-h-12 w-full bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50";

export function LinkSignIn({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This link is missing its code. Ask for a new one.");

  async function signIn() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sportsbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login_link", token }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      router.replace("/runitback/play");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(j.error ?? "Something went wrong.");
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {token && !error ? <p className="text-[0.95rem] text-[var(--color-mute)]">Tap to sign in to Run It Back on this device.</p> : null}
      {error ? <p className="text-[0.95rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {token && !error ? (
        <button type="button" onClick={signIn} disabled={busy} className={cta}>
          {busy ? "One sec…" : "Sign me in"}
        </button>
      ) : (
        <Link href="/runitback/play" className={`${cta} flex items-center justify-center`}>
          Go to sign in
        </Link>
      )}
    </div>
  );
}
