"use client";

import { useState } from "react";
import { subscribeEmail, subscribedMessage } from "./email-api";

/**
 * "Get Jaiye's newsletter." One email field and one age tick. A visitor says
 * they are 13 or older, or that they are a parent signing up their kid (then
 * the confirm email is the parent check). Used on the home page, /pod and
 * the episode and column pages.
 */
export default function NewsletterBox({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!adult && !parent) {
      setError("Tick one of the boxes so we know who is signing up.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await subscribeEmail({ email, newsletter: true, results: false, under13: parent && !adult, source: "fan-box" });
    setBusy(false);
    if (r.ok) setDone(subscribedMessage(r.status));
    else setError(r.error);
  }

  const check = "mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-red)]";
  return (
    <section aria-labelledby="nl-title" className={`border border-[var(--color-line-strong)] p-[clamp(20px,3vw,32px)] ${className}`}>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">Newsletter</div>
      <h2 id="nl-title" className="mt-3 max-w-[30ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.4rem,3vw,1.9rem)] font-black leading-[1.1] tracking-[-0.02em] text-pretty">
        Get Jaiye&apos;s newsletter: new episodes and columns.
      </h2>
      <p className="mt-2 text-[0.95rem] text-[var(--color-mute)]">One email when something&apos;s new.</p>
      {done ? (
        <p className="mt-5 text-[1rem]" role="status">
          {done}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 flex max-w-[460px] flex-col gap-3">
          <label htmlFor="nl-email" className="sr-only">
            Email
          </label>
          <input
            id="nl-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[1rem] text-[var(--color-bone)] placeholder:text-[var(--color-mute)] focus:border-[var(--color-red)] focus:outline-none"
          />
          <label className="flex items-start gap-3 text-[0.9rem]">
            <input type="checkbox" checked={adult} onChange={(e) => { setAdult(e.target.checked); if (e.target.checked) setParent(false); }} className={check} />
            I&apos;m 13 or older
          </label>
          <label className="flex items-start gap-3 text-[0.9rem]">
            <input type="checkbox" checked={parent} onChange={(e) => { setParent(e.target.checked); if (e.target.checked) setAdult(false); }} className={check} />
            I&apos;m a parent signing up my kid
          </label>
          {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50"
          >
            {busy ? "One sec…" : "Sign me up"}
          </button>
        </form>
      )}
    </section>
  );
}
