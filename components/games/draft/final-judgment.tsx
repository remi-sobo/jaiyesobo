"use client";

import {
  type DraftJudgement,
  type DraftPick,
  type DraftSide,
} from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  picks: DraftPick[];
  starts: DraftSide;
  verdict: DraftJudgement;
};

export default function FinalJudgment({ team, picks, verdict }: Props) {
  const human = picks.filter((p) => p.side === "human");
  const ai = picks.filter((p) => p.side === "ai");
  const youWon = verdict.winner === "human";
  const tied = verdict.winner === "tie";

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-6">
      {/* Verdict banner */}
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-4"
        style={{ color: team.primary_color }}
      >
        {team.abbreviation} · all-time draft
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-6">
        {tied ? (
          <>
            It&apos;s a <span className="italic font-normal text-[var(--color-games-yellow)]">tie.</span>
          </>
        ) : youWon ? (
          <>
            You <span className="italic font-normal text-[var(--color-red)]">won.</span>
          </>
        ) : (
          <>
            Claude <span className="italic font-normal text-[var(--color-red)]">won.</span>
          </>
        )}
      </h1>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.4rem)] text-[var(--color-bone)] leading-snug mb-12">
        {verdict.verdict}
      </p>

      {/* Side-by-side rosters with grades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <RosterCard
          label="You"
          accent={team.primary_color}
          grade={verdict.human_grade}
          summary={verdict.human_summary}
          picks={human}
          isWinner={youWon}
        />
        <RosterCard
          label="Claude"
          accent="var(--color-games-yellow)"
          grade={verdict.ai_grade}
          summary={verdict.ai_summary}
          picks={ai}
          isWinner={!youWon && !tied}
        />
      </div>
    </div>
  );
}

function RosterCard({
  label,
  accent,
  grade,
  summary,
  picks,
  isWinner,
}: {
  label: string;
  accent: string;
  grade: string;
  summary: string;
  picks: DraftPick[];
  isWinner: boolean;
}) {
  return (
    <div
      className={`rounded p-5 border bg-[var(--color-card)] ${
        isWinner ? "border-[var(--color-bone)]" : "border-[var(--color-line)]"
      }`}
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em]"
          style={{ color: accent }}
        >
          {label} {isWinner && "· winner"}
        </div>
        <div
          className="font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight"
          style={{ color: accent }}
        >
          {grade}
        </div>
      </div>
      <ol className="flex flex-col gap-1 mb-4">
        {picks.map((p, i) => (
          <li
            key={p.player_id}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[var(--color-line)]/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] w-5">
                {i + 1}
              </span>
              <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] text-[var(--color-bone)] truncate">
                {p.player_name}
              </span>
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
              {p.primary_position}
            </span>
          </li>
        ))}
      </ol>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] text-[var(--color-mute)] leading-snug">
        {summary}
      </p>
    </div>
  );
}
