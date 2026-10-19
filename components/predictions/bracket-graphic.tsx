import type { ReactNode } from "react";
import { TEAMS, type TeamCode } from "@/lib/nba/teams";
import { deriveBracket, seriesScore, type Bracket, type Series, type Slot } from "@/lib/nba/logic";
import type { PredictionPicks, SeriesKey, Side } from "@/lib/nba/types";
import { TeamChip } from "./team-tile";

/**
 * The broadcast style bracket. Layout switches on the width of its own
 * container (not the screen), so the off screen PNG export always gets the
 * wide version no matter what device is exporting it.
 */
export default function BracketGraphic({ picks }: { picks: PredictionPicks }) {
  const b = deriveBracket(picks);
  return (
    <div className="@container">
      <WideBracket b={b} />
      <StackedBracket b={b} />
    </div>
  );
}

/* One series card */

function TeamLine({ slot, series }: { slot: Slot; series: Series }) {
  if (!slot) {
    return (
      <div className="flex h-9 items-center gap-2 px-2">
        <span className="w-4 text-right font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-mute)]" />
        <span className="inline-flex h-8 w-11 items-center justify-center rounded-[3px] border border-dashed border-[var(--color-line-strong)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
          TBD
        </span>
      </div>
    );
  }
  const decided = !!series.winner;
  const won = series.winner === slot.code;
  const wins = !decided ? "" : won ? (series.games ? "4" : "") : series.games ? String(series.games - 4) : "";
  return (
    <div className={`flex h-9 items-center gap-2 px-2 ${decided && !won ? "opacity-45" : ""}`}>
      <span className="w-4 text-right font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-mute)]">
        {slot.seed}
      </span>
      <TeamChip code={slot.code} />
      <span className="min-w-0 flex-1 truncate text-[0.78rem] font-medium text-[var(--color-bone)]">
        {TEAMS[slot.code].name}
      </span>
      <span
        className={`w-4 text-right font-[family-name:var(--font-jetbrains)] text-[0.9rem] font-medium ${
          won ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"
        }`}
      >
        {wins}
      </span>
    </div>
  );
}

function SeriesCard({ s, big = false }: { s: Series; big?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-[4px] border bg-[var(--color-off-black)] ${
        big ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
      }`}
    >
      <TeamLine slot={s.top} series={s} />
      <div className="h-px bg-[var(--color-line)]" />
      <TeamLine slot={s.bottom} series={s} />
    </div>
  );
}

/* Wide layout: West left, Finals center, East right, with connector lines. */

const LINE = "bg-[var(--color-line-strong)]";

/** Half of a pair. Draws the short stub from the card toward the next round. */
function Feeder({ dir, children }: { dir: "right" | "left"; children: ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center">
      {children}
      <span className={`absolute top-1/2 h-px w-3 ${LINE} ${dir === "right" ? "-right-3" : "-left-3"}`} />
    </div>
  );
}

/** Two series that feed one. Vertical line joins them, a stub carries on. */
function Pair({ dir, a, b }: { dir: "right" | "left"; a: ReactNode; b: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <Feeder dir={dir}>{a}</Feeder>
      <Feeder dir={dir}>{b}</Feeder>
      <span className={`absolute top-1/4 bottom-1/4 w-px ${LINE} ${dir === "right" ? "-right-3" : "-left-3"}`} />
      <span className={`absolute top-1/2 h-px w-3 ${LINE} ${dir === "right" ? "-right-6" : "-left-6"}`} />
    </div>
  );
}

function ColumnHead({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
      {children}
    </div>
  );
}

function sideKeys(side: Side) {
  const k = (s: string) => `${side}-${s}` as SeriesKey;
  return {
    r1: [k("R1-1v8"), k("R1-4v5"), k("R1-3v6"), k("R1-2v7")],
    r2: [k("R2-TOP"), k("R2-BOT")],
    cf: k("CF"),
  };
}

function SideColumns({ b, side }: { b: Bracket; side: Side }) {
  const dir = side === "W" ? "right" : "left";
  const k = sideKeys(side);
  const name = side === "W" ? "West" : "East";
  const r1 = (
    <div key="r1" className="flex flex-col">
      <ColumnHead>{name} R1</ColumnHead>
      <div className="flex flex-1 flex-col">
        <Pair dir={dir} a={<SeriesCard s={b[k.r1[0]]} />} b={<SeriesCard s={b[k.r1[1]]} />} />
        <Pair dir={dir} a={<SeriesCard s={b[k.r1[2]]} />} b={<SeriesCard s={b[k.r1[3]]} />} />
      </div>
    </div>
  );
  const r2 = (
    <div key="r2" className="flex flex-col">
      <ColumnHead>{name} Semis</ColumnHead>
      <div className="flex flex-1 flex-col">
        <Pair dir={dir} a={<SeriesCard s={b[k.r2[0]]} />} b={<SeriesCard s={b[k.r2[1]]} />} />
      </div>
    </div>
  );
  const cf = (
    <div key="cf" className="flex flex-col">
      <ColumnHead>{name} Finals</ColumnHead>
      <div className="relative flex flex-1 items-center">
        <SeriesCard s={b[k.cf]} />
        <span className={`absolute top-1/2 h-px w-6 ${LINE} ${dir === "right" ? "-right-6" : "-left-6"}`} />
      </div>
    </div>
  );
  return <>{side === "W" ? [r1, r2, cf] : [cf, r2, r1]}</>;
}

function FinalsColumn({ b }: { b: Bracket }) {
  const f = b.FINALS;
  return (
    <div className="flex flex-col">
      <ColumnHead>
        <span className="text-[var(--color-red)]">NBA Finals</span>
      </ColumnHead>
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <SeriesCard s={f} big />
        {f.winner && f.games ? (
          <div className="text-center font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            {f.winner} in {f.games}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WideBracket({ b }: { b: Bracket }) {
  return (
    <div className="hidden min-h-[560px] grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-x-6 @min-[1000px]:grid">
      <SideColumns b={b} side="W" />
      <FinalsColumn b={b} />
      <SideColumns b={b} side="E" />
    </div>
  );
}

/* Narrow layout: one block per round. */

function StackedBracket({ b }: { b: Bracket }) {
  const w = sideKeys("W");
  const e = sideKeys("E");
  const rounds: Array<{ title: string; groups: Array<{ label: string; keys: SeriesKey[] }> }> = [
    { title: "First Round", groups: [{ label: "West", keys: w.r1 }, { label: "East", keys: e.r1 }] },
    { title: "Conference Semis", groups: [{ label: "West", keys: w.r2 }, { label: "East", keys: e.r2 }] },
    { title: "Conference Finals", groups: [{ label: "West", keys: [w.cf] }, { label: "East", keys: [e.cf] }] },
  ];
  return (
    <div className="flex flex-col gap-8 @min-[1000px]:hidden">
      {rounds.map((r) => (
        <div key={r.title}>
          <div className="mb-3 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
            {r.title}
          </div>
          <div className="grid gap-5 @min-[560px]:grid-cols-2">
            {r.groups.map((g) => (
              <div key={g.label} className="flex flex-col gap-2">
                <div className="font-[family-name:var(--font-fraunces)] text-[1rem] font-black">{g.label}</div>
                {g.keys.map((key) => (
                  <SeriesCard key={key} s={b[key]} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div className="mb-3 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
          NBA Finals
        </div>
        <div className="max-w-[420px]">
          <SeriesCard s={b.FINALS} big />
        </div>
      </div>
    </div>
  );
}

export function finalsHeadline(b: Bracket): string | null {
  const f = b.FINALS;
  if (!f.winner || !f.top || !f.bottom) return null;
  const loser: TeamCode = f.top.code === f.winner ? f.bottom.code : f.top.code;
  return `${f.winner} beats ${loser}${f.games ? ` ${seriesScore(f.games)}` : ""}`;
}
