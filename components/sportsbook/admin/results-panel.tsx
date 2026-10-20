"use client";

import { useState } from "react";
import { isTeamCode, teamsByCity, type TeamCode } from "@/lib/nba/teams";
import type { Board } from "@/lib/sportsbook/data";
import type { SbItem, SbPlayer, WeekStatus } from "@/lib/sportsbook/types";
import { useSbAction } from "./use-action";

const btn =
  "min-h-10 border px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] disabled:opacity-40";

export function BoardTable({ board }: { board: Board[] }) {
  if (board.length === 0) return <p className="text-[0.9rem] text-[var(--color-warm-mute)]">No picks yet.</p>;
  return (
    <ol className="flex flex-col">
      {board.map((b, i) => (
        <li key={b.player.id} className="flex items-center gap-3 border-t border-[var(--color-line)] py-2">
          <span className="w-5 text-right font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-warm-mute)]">{i + 1}</span>
          <span className={`flex-1 font-medium ${b.player.kind === "jaiye" ? "text-[var(--color-red)]" : ""}`}>
            {b.player.display_name}
            {b.player.kind !== "challenger" ? (
              <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">Sobo</span>
            ) : null}
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-warm-mute)]">
            {b.score.correct}-{b.score.wrong}
          </span>
          <span className="w-12 text-right font-[family-name:var(--font-jetbrains)] text-[1rem]">{b.score.points}</span>
        </li>
      ))}
    </ol>
  );
}

/** Monday: hand grade what code can't, review the recap, finalize. */
export default function ResultsPanel({
  week,
  status,
  items,
  board,
  recap,
}: {
  week: number;
  status: WeekStatus;
  items: SbItem[];
  board: Board[];
  recap: string | null;
}) {
  const { run, busy, error } = useSbAction();
  const [text, setText] = useState(recap ?? "");
  const open = items.filter((i) => i.status === "open");
  const isFinal = status === "final";

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="border border-[var(--color-red)] px-3 py-2 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}

      <section>
        <h2 className="mb-2 font-[family-name:var(--font-fraunces)] text-xl font-black">Week {week} board</h2>
        <BoardTable board={board} />
      </section>

      {!isFinal && open.length > 0 ? (
        <section>
          <h2 className="mb-1 font-[family-name:var(--font-fraunces)] text-xl font-black">Still open ({open.length})</h2>
          <p className="mb-3 text-[0.85rem] text-[var(--color-warm-mute)]">
            Games still to finish grade themselves overnight. Jaiye&apos;s Prop needs you to tap the right answer. Void anything that can&apos;t be decided.
          </p>
          <div className="flex flex-col gap-3">
            {open.map((item) => (
              <div key={item.id} className="border border-[var(--color-line-strong)] p-3">
                <div className="font-medium">{item.prompt}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.type === "custom"
                    ? item.options.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          disabled={!!busy}
                          onClick={() => run("grade", { item_id: item.id, winner: o.key }, item.id)}
                          className={`${btn} border-[var(--color-green)] text-[var(--color-green)]`}
                        >
                          {o.label} was right
                        </button>
                      ))
                    : null}
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run("grade", { item_id: item.id, winner: null }, item.id)}
                    className={`${btn} border-[var(--color-line-strong)] text-[var(--color-warm-mute)]`}
                  >
                    Void
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-[family-name:var(--font-fraunces)] text-xl font-black">Recap</h2>
        {isFinal ? (
          <p className="whitespace-pre-line leading-relaxed">{recap || "No recap."}</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Write it yourself or let the AI take a swing."
              className="w-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] p-3 leading-relaxed"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  const res = await run("recap", { week });
                  if (res && typeof res.recap === "string") setText(res.recap);
                }}
                className={`${btn} border-[var(--color-line-strong)]`}
              >
                {busy === "recap" ? "Writing…" : "Write it with AI"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => run("save_recap", { week, recap: text })} className={`${btn} border-[var(--color-line-strong)]`}>
                Save recap
              </button>
            </div>
          </>
        )}
      </section>

      {!isFinal ? (
        <section className="border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/50 p-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-black">Finalize week {week}</h2>
          <p className="mt-1 text-[0.85rem] text-[var(--color-warm-mute)]">
            Makes the points official and adds them to the season. Can&apos;t be undone.
          </p>
          <button
            type="button"
            disabled={!!busy || status !== "graded" || open.length > 0}
            onClick={() => {
              if (window.confirm(`Finalize week ${week}? Points become official and can't change.`)) void run("finalize", { week });
            }}
            className={`${btn} mt-3 border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]`}
          >
            Finalize week
          </button>
          {status !== "graded" ? (
            <p className="mt-2 text-[0.8rem] text-[var(--color-warm-mute)]">Available once Sunday&apos;s games are done.</p>
          ) : null}
        </section>
      ) : (
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-green)]">Final. Locked for good.</p>
      )}
    </div>
  );
}

export function ChallengersPanel({ players }: { players: SbPlayer[] }) {
  const { run, busy, error } = useSbAction();
  const challengers = players.filter((p) => p.kind === "challenger");
  return (
    <div>
      {error ? <p className="mb-3 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {challengers.length === 0 ? (
        <p className="text-[0.9rem] text-[var(--color-warm-mute)]">No challengers yet. Share jaiyesobo.com/sportsbook/play.</p>
      ) : (
        <ul className="flex flex-col">
          {challengers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] py-2">
              <span className={`flex-1 ${p.hidden ? "text-[var(--color-warm-dim)] line-through" : ""}`}>{p.display_name}</span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-warm-mute)]">{p.code}</span>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  const name = window.prompt("New name", p.display_name);
                  if (name) void run("player", { player_id: p.id, name }, p.id);
                }}
                className={`${btn} border-[var(--color-line-strong)]`}
              >
                Rename
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run("player", { player_id: p.id, hidden: !p.hidden }, p.id)}
                className={`${btn} border-[var(--color-line-strong)]`}
              >
                {p.hidden ? "Show" : "Hide"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TEAM_LIST = teamsByCity();

export function SettingsPanel({ favTeams, favPlayers }: { favTeams: TeamCode[]; favPlayers: string[] }) {
  const { run, busy, error } = useSbAction();
  const [teams, setTeams] = useState<TeamCode[]>(favTeams);
  const [playersText, setPlayersText] = useState(favPlayers.join(", "));
  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      <div>
        <div className="mb-2 text-[0.85rem] text-[var(--color-warm-mute)]">Jaiye&apos;s teams (the AI features them more)</div>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_LIST.map((t) => {
            const on = teams.includes(t.code);
            return (
              <button
                key={t.code}
                type="button"
                aria-pressed={on}
                onClick={() => setTeams(on ? teams.filter((x) => x !== t.code) : [...teams, t.code])}
                className={`min-h-9 border px-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] ${
                  on ? "border-[var(--color-red)] text-[var(--color-bone)]" : "border-[var(--color-line)] text-[var(--color-warm-mute)]"
                }`}
              >
                {t.code}
              </button>
            );
          })}
        </div>
      </div>
      <label className="text-[0.85rem] text-[var(--color-warm-mute)]">
        Jaiye&apos;s players, comma separated
        <input
          value={playersText}
          onChange={(e) => setPlayersText(e.target.value)}
          placeholder="Victor Wembanyama, De'Aaron Fox"
          className="mt-1 h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-3 text-[var(--color-bone)]"
        />
      </label>
      <button
        type="button"
        disabled={!!busy}
        onClick={() =>
          run("settings", {
            fav_teams: teams.filter(isTeamCode),
            fav_players: playersText.split(",").map((s) => s.trim()).filter(Boolean),
          })
        }
        className={`${btn} self-start border-[var(--color-red)] text-[var(--color-red)]`}
      >
        Save settings
      </button>
    </div>
  );
}
