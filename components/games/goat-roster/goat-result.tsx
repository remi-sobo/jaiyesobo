"use client";

import { ROSTER_SIZE, type GoatRosterVerdict, type RosterPick, type RosterPickVerdict } from "@/lib/goat-roster";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  picks: RosterPick[];
  verdict: GoatRosterVerdict;
};

const VERDICT_COLORS: Record<RosterPickVerdict["verdict"], string> = {
  elite: "var(--color-games-green)",
  smart: "var(--color-games-yellow)",
  reach: "var(--color-mute)",
  questionable: "var(--color-red-bright)",
};

const VERDICT_LABELS: Record<RosterPickVerdict["verdict"], string> = {
  elite: "Elite",
  smart: "Smart",
  reach: "Reach",
  questionable: "??",
};

export default function GoatResult({ team, picks, verdict }: Props) {
  return (
    <div className="max-w-[760px] mx-auto px-6 pt-10 pb-6">
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-4"
        style={{ color: team.primary_color }}
      >
        {team.abbreviation} · GOAT roster
      </div>

      {/* Score block */}
      <div className="flex items-baseline gap-4 mb-2">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(4rem,12vw,8rem)] leading-none tracking-[-0.04em]">
          {verdict.score}
          <span className="text-[var(--color-mute)] text-[0.4em]">/100</span>
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2rem,5vw,3.5rem)] leading-none text-[var(--color-games-yellow)]">
          {verdict.grade}
        </div>
      </div>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(0.85rem,1.2vw,1rem)] uppercase tracking-[0.15em] text-[var(--color-mute)] mb-6">
        Vibe: {verdict.vibe}
      </p>

      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.7vw,1.5rem)] text-[var(--color-bone)] leading-snug mb-10">
        {verdict.take}
      </p>

      {/* Per-pick verdicts */}
      <ol className="flex flex-col gap-2 mb-8">
        {picks.map((pick, i) => {
          const isSixthMan = i === ROSTER_SIZE - 1;
          const v =
            verdict.per_pick.find(
              (pp) => pp.name.toLowerCase().trim() === pick.player_name.toLowerCase().trim()
            ) ?? verdict.per_pick[i];
          const tag = v?.verdict ?? "smart";
          return (
            <li
              key={pick.player_id}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded border bg-[var(--color-card)] ${
                isSixthMan
                  ? "border-[var(--color-games-yellow)]/40"
                  : "border-[var(--color-line)]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] w-12"
                  style={{ color: isSixthMan ? "var(--color-games-yellow)" : "var(--color-mute)" }}
                >
                  {isSixthMan ? "6th" : `S${i + 1}`}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[1rem] text-[var(--color-bone)] leading-tight truncate">
                    {pick.player_name}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                    {pick.primary_position}
                  </span>
                </div>
              </div>
              <span
                className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] whitespace-nowrap"
                style={{ color: VERDICT_COLORS[tag] }}
              >
                {VERDICT_LABELS[tag]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
