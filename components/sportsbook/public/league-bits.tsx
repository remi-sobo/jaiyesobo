"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JoinForm } from "./challenger-play";

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; league_id?: string }> {
  const res = await fetch("/api/sportsbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as { error?: string; league_id?: string };
  return { ok: res.ok, ...j };
}

const cta =
  "inline-flex min-h-12 items-center justify-center bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)] disabled:opacity-50";
const input =
  "h-12 w-full border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[1rem] text-[var(--color-bone)] placeholder:text-[var(--color-mute)] focus:border-[var(--color-red)] focus:outline-none";

/** New visitor from an invite: one form joins the game and the league, then straight to picks. */
export function InviteJoin({ code, from }: { code: string; from: string | null }) {
  const router = useRouter();
  return <JoinForm league={code} from={from ?? undefined} onJoined={() => router.push("/runitback/play")} />;
}

/** Already playing: one tap to join the league. */
export function JoinLeagueButton({ code, from, name }: { code: string; from: string | null; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={busy}
        className={cta}
        onClick={async () => {
          setBusy(true);
          const r = await post({ action: "league_join", code, from });
          setBusy(false);
          if (!r.ok) setError(r.error ?? "Couldn't join.");
          else router.push(`/runitback/leagues/${r.league_id}`);
        }}
      >
        {busy ? "Joining…" : `Join ${name}`}
      </button>
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
    </div>
  );
}

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await post({ action: "league_join", code });
        setBusy(false);
        if (!r.ok) setError(r.error ?? "Couldn't join.");
        else router.push(`/runitback/leagues/${r.league_id}`);
      }}
    >
      <label htmlFor="league-code" className="sr-only">
        League code
      </label>
      <input id="league-code" className={input} value={code} maxLength={16} placeholder="CREW-1234" autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
      <button type="submit" disabled={busy || code.trim().length < 6} className={cta}>
        {busy ? "Joining…" : "Join"}
      </button>
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)] sm:self-center">{error}</p> : null}
    </form>
  );
}

export function CopyInvite({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: "Run It Back Picks", text: "Think you can beat me? Join my league.", url });
          else {
            await navigator.clipboard.writeText(url);
            setDone(true);
          }
        } catch {
          /* Share sheet closed. */
        }
      }}
      className="inline-flex min-h-11 items-center border border-[var(--color-line-strong)] px-4 font-[family-name:var(--font-jetbrains)] text-[0.68rem] uppercase tracking-[0.18em] hover:border-[var(--color-red)]"
    >
      {done ? "Link copied" : "Challenge someone"}
    </button>
  );
}

export function LeaveLeague({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm("Leave this league? You can rejoin with the code.")) return;
        const r = await post({ action: "league_leave", league_id: leagueId });
        if (r.ok) router.push("/runitback/leagues");
        else window.alert(r.error ?? "Couldn't leave.");
      }}
      className="text-[0.8rem] text-[var(--color-mute)] underline-offset-4 hover:underline"
    >
      Leave this league
    </button>
  );
}
