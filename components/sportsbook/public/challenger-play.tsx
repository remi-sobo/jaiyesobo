"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SbItem, SbPick, SbPlayerWithCode } from "@/lib/sportsbook/types";
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

const fieldLabel = "font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]";
const linkButton = "text-[0.85rem] text-[var(--color-mute)] underline-offset-4 hover:underline";

type Mode = "join" | "code" | "email" | "email_code";

export function JoinForm({ league, from, onJoined }: { league?: string; from?: string; onJoined?: () => void } = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState<"13_plus" | "under_13" | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [wantResults, setWantResults] = useState(true);
  const [wantNews, setWantNews] = useState(true);
  const [code, setCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [mode, setMode] = useState<Mode>("join");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "join" && !age) {
      setBusy(false);
      setError("Tell us if you're 13 or older.");
      return;
    }
    if (mode === "email") {
      const res = await post({ action: "login_email", email: loginEmail.trim() });
      setBusy(false);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else go("email_code");
      return;
    }
    const res =
      mode === "join"
        ? await post({
            action: "join",
            name,
            age_band: age,
            first_name: age === "13_plus" ? first.trim() || null : null,
            last_name: age === "13_plus" ? last.trim() || null : null,
            league: league ?? null,
            from: from ?? null,
            email: email.trim() || undefined,
            email_results: wantResults,
            email_newsletter: wantNews,
          })
        : mode === "email_code"
          ? await post({ action: "login_code", email: loginEmail.trim(), code: loginCode, league: league ?? null })
          : await post({ action: "restore", code });
    if (res.ok && mode === "code" && league) await post({ action: "league_join", code: league, from: from ?? null });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    else if (onJoined) onJoined();
    else router.refresh();
  }

  const submitLabel = busy ? "One sec…" : mode === "join" ? "I'm in" : mode === "email" ? "Email me a code" : "Let me back in";

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-[420px] flex-col gap-3">
      {mode === "join" ? (
        <>
          <label htmlFor="sb-name" className={fieldLabel}>
            Nickname
          </label>
          <input id="sb-name" className={input} value={name} maxLength={20} autoComplete="nickname" placeholder="Big Ticket" onChange={(e) => setName(e.target.value)} />
          <p className="text-[0.8rem] text-[var(--color-mute)]">Everybody sees your nickname on the board.</p>
          <fieldset className="mt-2 flex flex-col gap-2">
            <legend className={`mb-2 ${fieldLabel}`}>Are you 13 or older?</legend>
            <div className="flex gap-2">
              {([
                ["13_plus", "Yes"],
                ["under_13", "No"],
              ] as const).map(([v, label]) => (
                <label
                  key={v}
                  className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center border text-[0.95rem] ${age === v ? "border-[var(--color-red)] bg-[var(--color-red)]/15" : "border-[var(--color-line-strong)]"}`}
                >
                  <input type="radio" name="sb-age" value={v} checked={age === v} onChange={() => setAge(v)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
            {age === "under_13" ? (
              <p className="text-[0.8rem] text-[var(--color-mute)]">You can play and react. Trash talk and starting leagues are for 13 and up.</p>
            ) : null}
          </fieldset>
          {age === "13_plus" ? (
            <div className="mt-2 flex flex-col gap-2">
              <span className={fieldLabel}>Your real name (optional)</span>
              <div className="flex gap-2">
                <input aria-label="First name" className={input} value={first} maxLength={30} autoComplete="given-name" placeholder="First" onChange={(e) => setFirst(e.target.value)} />
                <input aria-label="Last name" className={input} value={last} maxLength={30} autoComplete="family-name" placeholder="Last" onChange={(e) => setLast(e.target.value)} />
              </div>
              <p className="text-[0.8rem] text-[var(--color-mute)]">Private. Only Jaiye and his dad see it, so they know who&apos;s who.</p>
            </div>
          ) : null}
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor="sb-email" className={fieldLabel}>
              {age === "under_13" ? "A parent's email (optional)" : "Email (optional)"}
            </label>
            <input id="sb-email" type="email" inputMode="email" autoComplete="email" className={input} value={email} maxLength={254} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            <p className="text-[0.8rem] text-[var(--color-mute)]">
              {age === "under_13" ? "Get your results every Monday. We'll ask them first." : "Get your results every Monday, and sign in on any device with a code."}
            </p>
            {email.trim() ? (
              <div className="flex flex-col gap-1">
                <label className="flex min-h-10 items-center gap-3 text-[0.9rem]">
                  <input type="checkbox" checked={wantResults} onChange={(e) => setWantResults(e.target.checked)} className="h-5 w-5 accent-[var(--color-red)]" />
                  My results every Monday
                </label>
                <label className="flex min-h-10 items-center gap-3 text-[0.9rem]">
                  <input type="checkbox" checked={wantNews} onChange={(e) => setWantNews(e.target.checked)} className="h-5 w-5 accent-[var(--color-red)]" />
                  Jaiye&apos;s newsletter: new episodes and columns
                </label>
              </div>
            ) : null}
          </div>
        </>
      ) : mode === "code" ? (
        <>
          <label htmlFor="sb-code" className={fieldLabel}>
            Your player code
          </label>
          <input id="sb-code" className={input} value={code} maxLength={16} placeholder="HOOP-1234" autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
        </>
      ) : mode === "email" ? (
        <>
          <label htmlFor="sb-login-email" className={fieldLabel}>
            Your email
          </label>
          <input id="sb-login-email" type="email" inputMode="email" autoComplete="email" className={input} value={loginEmail} maxLength={254} placeholder="you@example.com" onChange={(e) => setLoginEmail(e.target.value)} />
          <p className="text-[0.8rem] text-[var(--color-mute)]">For players 13 and up who confirmed their email. Under 13? Use your player code.</p>
        </>
      ) : (
        <>
          <label htmlFor="sb-login-code" className={fieldLabel}>
            6 digit code
          </label>
          <input
            id="sb-login-code"
            className={`${input} font-[family-name:var(--font-jetbrains)] tracking-[0.3em]`}
            value={loginCode}
            maxLength={7}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            onChange={(e) => setLoginCode(e.target.value)}
          />
          <p className="text-[0.8rem] text-[var(--color-mute)]">
            If {loginEmail.trim() || "that email"} is on a player, the code is on its way. It works for 15 minutes. Check spam if it&apos;s not there.
          </p>
        </>
      )}
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
      <button type="submit" disabled={busy} className={cta}>
        {submitLabel}
      </button>
      {mode === "join" ? (
        <button type="button" onClick={() => go("email")} className={linkButton}>
          Already playing? Sign back in
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1">
          {mode === "code" ? (
            <button type="button" onClick={() => go("email")} className={linkButton}>
              No code? Email me a login code
            </button>
          ) : mode === "email_code" ? (
            <button type="button" onClick={() => go("email")} className={linkButton}>
              Send a new code
            </button>
          ) : (
            <button type="button" onClick={() => go("code")} className={linkButton}>
              Use my player code instead
            </button>
          )}
          <button type="button" onClick={() => go("join")} className={linkButton}>
            New here? Join with a nickname
          </button>
        </div>
      )}
    </form>
  );
}

export function PlayBoard({
  me,
  items,
  picks,
  now,
  week,
  submitted,
  newCode,
}: {
  me: SbPlayerWithCode;
  items: SbItem[];
  picks: SbPick[];
  now: number;
  week: number;
  submitted: boolean;
  newCode?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const mine = (id: string) => picks.find((p) => p.item_id === id && p.player_id === me.id);
  const lockOn = picks.find((p) => p.player_id === me.id && p.is_lock)?.item_id ?? null;
  const picked = (id: string) => {
    const p = mine(id);
    return !!p && (p.choice !== null || p.guess !== null);
  };
  const done = items.filter((i) => picked(i.id)).length;
  // Cards that still need an answer before Submit turns on. Started games don't count.
  const missing = items.filter((i) => Date.parse(i.locks_at) > now && !picked(i.id));
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!window.confirm("Lock in your picks? You can't change them after this.")) return;
    setSubmitting(true);
    setError(null);
    const res = await post({ action: "submit", week });
    setSubmitting(false);
    if (!res.ok) setError(res.error ?? "Couldn't submit.");
    router.refresh();
  }

  const submitBlock = submitted ? (
    <div className="border border-[var(--color-green)] bg-[var(--color-green)]/10 p-4 text-center">
      <div className="font-[family-name:var(--font-fraunces)] text-2xl font-black text-[var(--color-green)]">✓ Your picks are in!</div>
      <p className="mt-1 text-[0.9rem] text-[var(--color-mute)]">
        You&apos;re locked in. Come back after the games and see if you beat us.
      </p>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={missing.length > 0 || submitting}
        onClick={submit}
        className="min-h-14 w-full max-w-[420px] bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.8rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--color-red)]"
      >
        {submitting ? "Submitting…" : missing.length > 0 ? `${missing.length} ${missing.length === 1 ? "card" : "cards"} left to pick` : "Submit my picks"}
      </button>
      <span className="text-[0.8rem] text-[var(--color-mute)]">
        {missing.length > 0 ? "Pick them all, then submit." : "After you submit, no changes. No take backs."}
      </span>
    </div>
  );

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
            {submitted ? "You're locked in. Good luck. You're gonna need it." : `${done} of ${items.length} picked. Pick them all, then hit Submit.`}
          </div>
        </div>
        <div className={`font-[family-name:var(--font-jetbrains)] text-[0.75rem] ${newCode ? "text-[var(--color-games-yellow)]" : "text-[var(--color-mute)]"}`}>
          Your code: <span className="text-[var(--color-bone)]">{me.code}</span>
          <div className="text-[0.65rem]">Save it so you can play on another phone.</div>
        </div>
      </div>
      {error ? <p className="mb-4 border border-[var(--color-red)] px-3 py-2 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {submitted ? <div className="mb-6">{submitBlock}</div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <PlayCard
            key={item.id}
            item={item}
            pick={mine(item.id)}
            now={now}
            saving={saving === item.id}
            lockElsewhere={!!lockOn && lockOn !== item.id}
            frozen={submitted}
            needsPick={!submitted && missing.some((m) => m.id === item.id)}
            onSave={(p) => save(item.id, p)}
          />
        ))}
      </div>
      <div className="mt-8">{submitBlock}</div>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm("Leave on this phone? You can come back with your code.")) return;
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
  frozen,
  needsPick,
  onSave,
}: {
  item: SbItem;
  pick: SbPick | undefined;
  now: number;
  saving: boolean;
  lockElsewhere: boolean;
  frozen: boolean;
  needsPick: boolean;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const locked = isLocked(item, now) || item.status !== "open" || frozen;
  const picked = !!pick && (pick.choice !== null || pick.guess !== null);
  const [guess, setGuess] = useState(pick?.guess !== null && pick?.guess !== undefined ? String(pick.guess) : "");
  return (
    <div
      className={`flex flex-col border bg-[var(--color-off-black)] p-4 ${
        needsPick ? "border-[var(--color-red)]" : picked ? "border-[var(--color-line-hover)]" : "border-[var(--color-line-strong)]"
      }`}
    >
      {needsPick ? (
        <div className="mb-2 self-start bg-[var(--color-red)] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-black)]">
          Needs a pick
        </div>
      ) : null}
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
