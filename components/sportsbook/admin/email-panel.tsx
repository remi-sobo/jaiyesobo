"use client";

import { useState } from "react";
import { useSbAction } from "./use-action";

const btn =
  "min-h-10 border border-[var(--color-line-strong)] px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] hover:border-[var(--color-red)] disabled:opacity-50";
const mono = "font-[family-name:var(--font-jetbrains)]";

export type EmailStats = { confirmed: number; pending: number; unsubscribed: number; results: number; newsletter: number };

export type NewsletterChoice = {
  kind: "episode" | "column";
  slug: string;
  label: string;
  subject: string;
  lines: string[];
  alreadySent: number;
};

export function SubscribersPanel({ stats, enabled }: { stats: EmailStats; enabled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {enabled ? null : (
        <p className="border border-[var(--color-games-yellow)] px-3 py-2 text-[0.9rem]">Email is off until RESEND_API_KEY is set. People can still sign up; nothing is sent.</p>
      )}
      <div className="grid gap-px bg-[var(--color-line-strong)] [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        {(
          [
            ["Confirmed", stats.confirmed],
            ["Pending", stats.pending],
            ["Unsubscribed", stats.unsubscribed],
            ["Get results", stats.results],
            ["Get newsletter", stats.newsletter],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="bg-[var(--color-black)] p-4">
            <div className={`${mono} text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>{label}</div>
            <div className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-black">{n}</div>
          </div>
        ))}
      </div>
      <p className="text-[0.8rem] text-[var(--color-warm-mute)]">Results and newsletter counts are confirmed subscribers only. Addresses are never shown here.</p>
    </div>
  );
}

export function NewsletterPanel({ choices, audience, enabled }: { choices: NewsletterChoice[]; audience: number; enabled: boolean }) {
  const { run, busy, error } = useSbAction();
  const [pick, setPick] = useState(0);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const c = choices[pick];
  if (!c) return <p className="text-[0.9rem] text-[var(--color-warm-mute)]">No episodes or columns yet.</p>;
  const left = Math.max(0, audience - c.alreadySent);

  return (
    <div className="flex max-w-[640px] flex-col gap-3">
      {enabled ? null : <p className="border border-[var(--color-games-yellow)] px-3 py-2 text-[0.9rem]">Email is off until RESEND_API_KEY is set. Tests and sends are skipped.</p>}
      <label htmlFor="nl-pick" className="sr-only">
        Episode or column
      </label>
      <select
        id="nl-pick"
        className="h-10 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[0.95rem]"
        value={pick}
        onChange={(e) => {
          setPick(Number(e.target.value));
          setMsg(null);
        }}
      >
        {choices.map((x, i) => (
          <option key={`${x.kind}:${x.slug}`} value={i}>
            {x.label}
          </option>
        ))}
      </select>
      <div className="border border-[var(--color-line-strong)] p-3">
        <div className={`${mono} text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>Subject</div>
        <div className="mt-1 font-semibold">{c.subject}</div>
        <div className={`${mono} mt-3 text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>Starts like this</div>
        {c.lines.map((l, i) => (
          <p key={i} className="mt-1 text-[0.9rem] text-[var(--color-warm-mute)]">
            {l}
          </p>
        ))}
      </div>
      <label htmlFor="nl-note" className={`${mono} text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]`}>
        A line from Jaiye (optional)
      </label>
      <input
        id="nl-note"
        className="h-10 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[0.95rem]"
        value={note}
        maxLength={240}
        onChange={(e) => setNote(e.target.value)}
        placeholder="This one is about the Blazers."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={async () => {
            setMsg(null);
            const r = await run("newsletter_test", { kind: c.kind, slug: c.slug, note }, "test");
            if (r) setMsg(r.status === "skipped" ? "Skipped: no RESEND_API_KEY yet." : "Test sent to your address.");
          }}
        >
          {busy === "test" ? "Sending…" : "Send test to me"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={!!busy}
          onClick={async () => {
            setMsg(null);
            const r = await run("email_catchup", {}, "catchup");
            if (r) setMsg(r.checked ? `Sent ${r.sent} waiting confirmation ${r.sent === 1 ? "email" : "emails"}.` : "Nobody is waiting on a confirmation email.");
          }}
        >
          {busy === "catchup" ? "Sending…" : "Send waiting confirmations"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={!!busy || left === 0}
          onClick={async () => {
            if (!window.confirm(`Send "${c.subject}" to ${left} ${left === 1 ? "subscriber" : "subscribers"}? This can't be undone.`)) return;
            setMsg(null);
            const r = await run("newsletter_send", { kind: c.kind, slug: c.slug, note }, "send");
            if (r) {
              setMsg(
                r.off
                  ? "Skipped: no RESEND_API_KEY yet."
                  : `Sent ${r.sent}. ${r.already ? `${r.already} already had it. ` : ""}${r.errors ? `${r.errors} failed. ` : ""}${r.unfinished ? "Out of time: press Send again to finish." : ""}`,
              );
            }
          }}
        >
          {busy === "send" ? "Sending…" : `Send to ${left} ${left === 1 ? "subscriber" : "subscribers"}`}
        </button>
      </div>
      {c.alreadySent > 0 ? <p className="text-[0.8rem] text-[var(--color-warm-mute)]">{c.alreadySent} already got this one.</p> : null}
      {msg ? <p className="text-[0.9rem]">{msg}</p> : null}
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
    </div>
  );
}
