"use client";

import { useState } from "react";
import { TEAMS } from "@/lib/nba/teams";
import { deriveBracket, seriesLine, type Bracket, type Series } from "@/lib/nba/logic";
import type { PredictionPicks, SeriesGames, SeriesKey, Side } from "@/lib/nba/types";
import { TeamTile } from "../team-tile";
import type { UpdatePicks } from "./builder";
import PickButton from "./pick-button";
import { MonoLabel, StepIntro } from "./ui";

const GAMES: SeriesGames[] = [4, 5, 6, 7];

function shortLabel(s: Series): string {
  if (s.round === "R1") return s.key.slice(5).replace("v", " vs ");
  if (s.round === "R2") return s.key.endsWith("TOP") ? "Semis, top" : "Semis, bottom";
  if (s.round === "CF") return `${s.side === "W" ? "West" : "East"} Finals`;
  return "NBA Finals";
}

function PickCard({ s, update, big = false }: { s: Series; update: UpdatePicks; big?: boolean }) {
  const ready = !!s.top && !!s.bottom;
  function pickWinner(code: NonNullable<Series["winner"]>) {
    update((p) => {
      const prev = p.bracket[s.key];
      return { ...p, bracket: { ...p.bracket, [s.key]: { winner: code, games: prev?.games ?? null } } };
    }, "playoffs");
  }
  function pickGames(games: SeriesGames) {
    if (!s.winner) return;
    update((p) => ({ ...p, bracket: { ...p.bracket, [s.key]: { winner: s.winner!, games } } }), "playoffs");
  }
  return (
    <div
      className={`flex w-full flex-col gap-1.5 border bg-[var(--color-warm-surface)]/50 p-2 ${
        big ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
      }`}
    >
      <MonoLabel className={big ? "text-[var(--color-red)]" : ""}>{shortLabel(s)}</MonoLabel>
      {[s.top, s.bottom].map((slot, i) => (
        <PickButton
          key={slot?.code ?? i}
          slot={slot}
          compact
          picked={!!slot && s.winner === slot.code}
          decided={!!s.winner}
          onPick={() => slot && ready && pickWinner(slot.code)}
        />
      ))}
      <div className="flex items-center gap-1" role="group" aria-label="How many games">
        {GAMES.map((g) => (
          <button
            key={g}
            type="button"
            disabled={!s.winner}
            aria-pressed={s.games === g}
            onClick={() => pickGames(g)}
            className={`h-9 flex-1 border font-[family-name:var(--font-jetbrains)] text-[0.8rem] transition-colors disabled:opacity-30 ${
              s.games === g
                ? "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]"
                : "border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-warm-mute)]"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="h-4 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        {!ready ? "Waiting on earlier picks" : s.winner ? (s.games ? seriesLine(s) : "How many games?") : "Tap the winner"}
      </div>
    </div>
  );
}

function keys(side: Side) {
  const k = (x: string) => `${side}-${x}` as SeriesKey;
  return {
    r1: [k("R1-1v8"), k("R1-4v5"), k("R1-3v6"), k("R1-2v7")],
    r2: [k("R2-TOP"), k("R2-BOT")],
    cf: [k("CF")],
  };
}

function Column({ title, list, b, update }: { title: string; list: SeriesKey[]; b: Bracket; update: UpdatePicks }) {
  return (
    <div className="flex flex-col">
      <MonoLabel className="mb-2 text-center">{title}</MonoLabel>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {list.map((key) => (
          <PickCard key={key} s={b[key]} update={update} />
        ))}
      </div>
    </div>
  );
}

function ChampionNote({ b }: { b: Bracket }) {
  const champ = b.FINALS.winner;
  if (!champ) return null;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <MonoLabel className="text-[var(--color-red)]">Your champion</MonoLabel>
      <TeamTile code={champ} size="lg" />
      <div className="font-[family-name:var(--font-fraunces)] text-lg font-black">{TEAMS[champ].name}</div>
    </div>
  );
}

function FullBracket({ b, update }: { b: Bracket; update: UpdatePicks }) {
  const w = keys("W");
  const e = keys("E");
  return (
    <div className="hidden grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.15fr)_repeat(3,minmax(0,1fr))] gap-3 @min-[1080px]:grid">
      <Column title="West R1" list={w.r1} b={b} update={update} />
      <Column title="West Semis" list={w.r2} b={b} update={update} />
      <Column title="West Finals" list={w.cf} b={b} update={update} />
      <div className="flex flex-col justify-center gap-6">
        <PickCard s={b.FINALS} update={update} big />
        <ChampionNote b={b} />
      </div>
      <Column title="East Finals" list={e.cf} b={b} update={update} />
      <Column title="East Semis" list={e.r2} b={b} update={update} />
      <Column title="East R1" list={e.r1} b={b} update={update} />
    </div>
  );
}

const TABS = [
  { id: "r1", label: "R1" },
  { id: "r2", label: "Semis" },
  { id: "cf", label: "Conf Finals" },
  { id: "finals", label: "Finals" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function RoundTabs({ b, update }: { b: Bracket; update: UpdatePicks }) {
  const [tab, setTab] = useState<TabId>("r1");
  const w = keys("W");
  const e = keys("E");
  const left = (list: SeriesKey[]) => list.filter((k) => !b[k].winner || !b[k].games).length;
  const counts: Record<TabId, number> = {
    r1: left([...w.r1, ...e.r1]),
    r2: left([...w.r2, ...e.r2]),
    cf: left([...w.cf, ...e.cf]),
    finals: left(["FINALS"]),
  };
  return (
    <div className="@min-[1080px]:hidden">
      <div className="mb-5 grid grid-cols-4 gap-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex min-h-12 flex-col items-center justify-center border px-1 text-[0.8rem] font-medium ${
              tab === t.id
                ? "border-[var(--color-red)] text-[var(--color-bone)]"
                : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)]"
            }`}
          >
            {t.label}
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] tracking-[0.1em]">
              {counts[t.id] === 0 ? "✓" : `${counts[t.id]} left`}
            </span>
          </button>
        ))}
      </div>
      {tab === "finals" ? (
        <div className="mx-auto flex max-w-[420px] flex-col gap-8">
          <PickCard s={b.FINALS} update={update} big />
          <ChampionNote b={b} />
        </div>
      ) : (
        <div className="grid gap-6 @min-[600px]:grid-cols-2">
          {(["W", "E"] as Side[]).map((side) => {
            const k = keys(side)[tab];
            return (
              <div key={side} className="flex flex-col gap-3">
                <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-black">{side === "W" ? "West" : "East"}</h2>
                {k.map((key) => (
                  <PickCard key={key} s={b[key]} update={update} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PlayoffsStep({ picks, update }: { picks: PredictionPicks; update: UpdatePicks }) {
  const b = deriveBracket(picks);
  return (
    <div>
      <StepIntro title="Pick the playoffs." accent="playoffs.">
        Tap who wins each series, then how many games. The next round fills in by itself.
      </StepIntro>
      <FullBracket b={b} update={update} />
      <RoundTabs b={b} update={update} />
    </div>
  );
}
