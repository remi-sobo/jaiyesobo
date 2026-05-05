"use client";

import type { WheelRound, WheelPlayerNames } from "@/lib/games/draft-wheel";

type Props = {
  round: WheelRound;
  rounds: WheelRound[]; // full game state (for the running roster preview)
  names: WheelPlayerNames;
  isFinalRound: boolean;
  onContinue: () => void;
};

/**
 * Between-round summary. Shows both picks for the just-completed round
 * side-by-side, then a running tally of each player's roster so far.
 */
export default function RoundComplete({ round, rounds, names, isFinalRound, onContinue }: Props) {
  const completedRounds = rounds.filter((r) => r.pick_a && r.pick_b);

  return (
    <div className="max-w-[820px] mx-auto px-6 pt-12 pb-20">
      <div className="text-center mb-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)]">
        Round {round.index + 1} · {round.slot} · locked
      </div>
      <h2 className="text-center font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] mb-10">
        That&apos;s the <span className="italic font-normal text-[var(--color-red)]">{round.slot}</span>.
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <PickReveal name={names.a} round={round} side="a" />
        <PickReveal name={names.b} round={round} side="b" />
      </div>

      {completedRounds.length > 0 && (
        <div className="mb-12">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4 text-center">
            Rosters so far
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RosterTally name={names.a} rounds={completedRounds} side="a" />
            <RosterTally name={names.b} rounds={completedRounds} side="b" />
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          autoFocus
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          {isFinalRound ? "Send it to the judge →" : "Spin next round →"}
        </button>
      </div>
    </div>
  );
}

function PickReveal({ name, round, side }: { name: string; round: WheelRound; side: "a" | "b" }) {
  const team = side === "a" ? round.a : round.b;
  const pick = side === "a" ? round.pick_a : round.pick_b;
  const accent = team?.team.primary_color ?? "var(--color-games-yellow)";
  if (!team || !pick) return null;
  return (
    <div
      className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5"
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] mb-2"
        style={{ color: accent }}
      >
        {name}
        {team.rerolled && <span className="ml-2 text-[var(--color-mute)]">· re-rolled</span>}
      </div>
      <div className="font-[family-name:var(--font-fraunces)] text-[0.85rem] text-[var(--color-mute)] mb-1">
        {team.team.city} {team.team.name}
      </div>
      <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.4rem,3vw,1.9rem)] leading-tight tracking-tight text-[var(--color-bone)] mb-1">
        {pick.player_name}
      </div>
      {pick.peak_label && (
        <div className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-mute)] leading-snug">
          {pick.peak_label}
        </div>
      )}
    </div>
  );
}

function RosterTally({
  name,
  rounds,
  side,
}: {
  name: string;
  rounds: WheelRound[];
  side: "a" | "b";
}) {
  return (
    <div className="bg-[var(--color-card)]/50 border border-[var(--color-line)] rounded p-4">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-3">
        {name}
      </div>
      <ol className="flex flex-col gap-1">
        {rounds.map((r) => {
          const pick = side === "a" ? r.pick_a : r.pick_b;
          const team = side === "a" ? r.a : r.b;
          if (!pick || !team) return null;
          return (
            <li
              key={r.index}
              className="flex items-baseline justify-between gap-3 px-2 py-1.5 rounded"
            >
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] w-7 shrink-0">
                {r.slot}
              </span>
              <span className="flex-1 font-[family-name:var(--font-fraunces)] text-[0.95rem] text-[var(--color-bone)] truncate">
                {pick.player_name}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] uppercase tracking-[0.15em] text-[var(--color-mute)] truncate">
                {team.team.abbreviation}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
