"use client";

import { useEffect, useState } from "react";
import type { WheelSlot } from "@/lib/games/draft-wheel";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  slot: WheelSlot;
  position: "G" | "F" | "C";
  roundNumber: number; // 1..5
  /** Player names — used for the "X gets the …" reveal. */
  aName: string;
  bName: string;
  /** Final assignments. Component animates THEN settles on these. */
  teamA: DraftTeamPayload;
  teamB: DraftTeamPayload;
  /** Pool of all eligible team payloads — used for the spin animation flicker. */
  spinPool: DraftTeamPayload[];
  onSettled: () => void;
};

const SPIN_MS = 2000;
const FLICKER_INTERVAL_MS = 90;

/**
 * The dramatic team-reveal screen. Both players' assignments flicker through
 * random team names for ~2s, then both settle simultaneously and the
 * "Continue →" button enables.
 */
export default function WheelSpin({
  slot,
  position,
  roundNumber,
  aName,
  bName,
  teamA,
  teamB,
  spinPool,
  onSettled,
}: Props) {
  const [tickA, setTickA] = useState<DraftTeamPayload>(teamA);
  const [tickB, setTickB] = useState<DraftTeamPayload>(teamB);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pool = spinPool.length > 0 ? spinPool : [teamA, teamB];
      if (elapsed >= SPIN_MS || pool.length === 0) {
        window.clearInterval(id);
        setTickA(teamA);
        setTickB(teamB);
        setSettled(true);
        return;
      }
      setTickA(pool[Math.floor(Math.random() * pool.length)]);
      setTickB(pool[Math.floor(Math.random() * pool.length)]);
    }, FLICKER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [teamA, teamB, spinPool]);

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-10 pb-16">
      <div className="text-center mb-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
        Round {roundNumber} of 5
      </div>
      <h2 className="text-center font-[family-name:var(--font-fraunces)] font-black text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.02em] mb-2">
        Spinning for{" "}
        <span className="italic font-normal text-[var(--color-games-yellow)]">{slot}</span>
      </h2>
      <p className="text-center text-[var(--color-mute)] mb-10">
        Position: <span className="text-[var(--color-bone)]">{positionLabel(position)}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <TeamCard playerName={aName} team={tickA} settled={settled} accent="var(--color-red)" />
        <TeamCard
          playerName={bName}
          team={tickB}
          settled={settled}
          accent="var(--color-games-yellow)"
        />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSettled}
          disabled={!settled}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {settled ? "Pick your players →" : "Spinning…"}
        </button>
      </div>
    </div>
  );
}

function TeamCard({
  playerName,
  team,
  settled,
  accent,
}: {
  playerName: string;
  team: DraftTeamPayload;
  settled: boolean;
  accent: string;
}) {
  return (
    <div
      className={`bg-[var(--color-card)] border border-[var(--color-line)] rounded p-6 text-center transition-all ${
        settled ? "" : "opacity-90"
      }`}
      style={{ borderTop: `4px solid ${settled ? team.primary_color : accent}` }}
    >
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-2"
        style={{ color: accent }}
      >
        {playerName}
      </div>
      <div
        className={`font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.4rem,3.5vw,2rem)] leading-tight tracking-[-0.01em] mb-1 transition-opacity ${
          settled ? "text-[var(--color-bone)]" : "text-[var(--color-mute)]"
        }`}
      >
        {team.city}
      </div>
      <div
        className={`font-[family-name:var(--font-fraunces)] italic text-[clamp(1.6rem,4vw,2.5rem)] leading-none ${
          settled ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"
        }`}
      >
        {team.name}
      </div>
      {settled && (
        <div className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {team.abbreviation} · est. {team.founded}
        </div>
      )}
    </div>
  );
}

function positionLabel(p: "G" | "F" | "C"): string {
  if (p === "G") return "Guard";
  if (p === "F") return "Forward";
  return "Center";
}
