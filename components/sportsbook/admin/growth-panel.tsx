"use client";

import { useState } from "react";
import { useSbAction } from "./use-action";
import type { OpenReport } from "@/lib/sportsbook/safety";

type LeagueRow = { id: string; name: string; code: string; members: number; commissioner: string };

const btn =
  "min-h-10 border border-[var(--color-line-strong)] px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] hover:border-[var(--color-red)] disabled:opacity-50";
const input =
  "h-10 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3 text-[0.95rem] focus:border-[var(--color-red)] focus:outline-none";

export function ReportsPanel({ reports }: { reports: OpenReport[] }) {
  const { run, busy, error } = useSbAction();
  if (reports.length === 0) return <p className="text-[0.9rem] text-[var(--color-warm-mute)]">No open reports.</p>;
  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {reports.map((r) => (
        <div key={r.target_player_id} className="flex flex-wrap items-center gap-3 border border-[var(--color-line-strong)] p-3">
          <span className="min-w-0 flex-1">
            <strong>{r.display_name}</strong> · {r.count} {r.count === 1 ? "report" : "reports"} ({r.contexts.join(", ")}){r.hidden ? " · hidden now" : ""}
          </span>
          <button type="button" className={btn} disabled={!!busy} onClick={() => run("reports_resolve", { player_id: r.target_player_id, unhide: true }, `ok:${r.target_player_id}`)}>
            Looks fine, show them
          </button>
          <button type="button" className={btn} disabled={!!busy} onClick={() => run("player", { player_id: r.target_player_id, hidden: true }, `hide:${r.target_player_id}`).then(() => run("reports_resolve", { player_id: r.target_player_id, unhide: false }))}>
            Keep hidden
          </button>
        </div>
      ))}
      <p className="text-[0.8rem] text-[var(--color-warm-mute)]">To rename someone instead, use Challengers below.</p>
    </div>
  );
}

export function LeaguesPanel({ leagues }: { leagues: LeagueRow[] }) {
  const { run, busy, error } = useSbAction();
  const [name, setName] = useState("");
  const [as, setAs] = useState<"remi" | "jaiye">("remi");
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run("league_create", { name, as });
          if (r) setName("");
        }}
      >
        <label htmlFor="new-league" className="sr-only">
          League name
        </label>
        <input id="new-league" className={input} value={name} maxLength={30} placeholder="Sobo Family" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="league-owner" className="sr-only">
          Commissioner
        </label>
        <select id="league-owner" className={input} value={as} onChange={(e) => setAs(e.target.value as "remi" | "jaiye")}>
          <option value="remi">Remi runs it</option>
          <option value="jaiye">Jaiye runs it</option>
        </select>
        <button type="submit" className={btn} disabled={!!busy || name.trim().length < 3}>
          {busy === "league_create" ? "Making…" : "Create league"}
        </button>
      </form>
      {error ? <p className="text-[0.85rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {leagues.length === 0 ? (
        <p className="text-[0.9rem] text-[var(--color-warm-mute)]">No leagues yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {leagues.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 border border-[var(--color-line-strong)] p-3">
              <span className="min-w-0 flex-1">
                <strong>{l.name}</strong> · {l.members} players · run by {l.commissioner}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.8rem]">/runitback/l/{l.code}</span>
              <button type="button" className={btn} disabled={!!busy} onClick={() => window.confirm(`Close ${l.name}? Players keep their picks.`) && run("league_archive", { league_id: l.id }, `arch:${l.id}`)}>
                Close
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
