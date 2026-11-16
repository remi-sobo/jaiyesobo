"use client";

import { useState } from "react";

const input =
  "h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[0.95rem] text-[var(--color-bone)] placeholder:text-[var(--color-mute)] focus:border-[var(--color-red)] focus:outline-none";

/**
 * "Your real name" for a signed in 13+ player. Private: only Jaiye and Remi
 * see it, next to the nickname. Under 13 never sees this box.
 */
export function RealNamesBox({ first, last }: { first: string | null; last: string | null }) {
  const [f, setF] = useState(first ?? "");
  const [l, setL] = useState(last ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const saved = [first, last].filter(Boolean).join(" ");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/sportsbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "names", first_name: f.trim() || null, last_name: l.trim() || null }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: j.error ?? "Something went wrong." });
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] underline-offset-4 hover:text-[var(--color-red)] hover:underline"
      >
        {saved ? `Real name: ${saved} · Change` : "Add your real name (private)"}
      </button>
    );

  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-[420px] flex-col gap-2 text-left">
      <div className="flex gap-2">
        <input aria-label="First name" className={input} value={f} maxLength={30} autoComplete="given-name" placeholder="First" onChange={(e) => setF(e.target.value)} />
        <input aria-label="Last name" className={input} value={l} maxLength={30} autoComplete="family-name" placeholder="Last" onChange={(e) => setL(e.target.value)} />
      </div>
      <p className="text-[0.8rem] text-[var(--color-mute)]">Private. Only Jaiye and his dad see it, so they know who&apos;s who. Leave both empty to remove it.</p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-[var(--color-red)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {msg ? <span className={`text-[0.85rem] ${msg.ok ? "text-[var(--color-mute)]" : "text-[var(--color-red-soft)]"}`}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
