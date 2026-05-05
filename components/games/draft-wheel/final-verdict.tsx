"use client";

import type {
  DraftWheelPlayPayload,
  DraftWheelVerdict,
  WheelRound,
  WheelSide,
} from "@/lib/games/draft-wheel";

type Props = {
  payload: DraftWheelPlayPayload;
  verdict: DraftWheelVerdict;
};

/**
 * The post-game reveal. Renders:
 *   1. Winner banner (player name)
 *   2. Best-of-7 series block (if AI returned series_score/story)
 *   3. Closing verdict line
 *   4. Per-slot calls (Mike Breen one-liners), in order
 *   5. Side-by-side rosters with grades + summaries
 */
export default function DraftWheelFinalVerdict({ payload, verdict }: Props) {
  const aName = payload.player_names.a;
  const bName = payload.player_names.b;
  const winnerLabel =
    verdict.winner === "a" ? aName : verdict.winner === "b" ? bName : null;
  const tied = verdict.winner === "tie";
  const seriesWinnerLabel = verdict.winner === "a" ? aName : verdict.winner === "b" ? bName : null;

  return (
    <div className="max-w-[940px] mx-auto px-6 pt-10 pb-6">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-4">
        Draft Wheel · final
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-6">
        {tied ? (
          <>
            It&apos;s a <span className="italic font-normal text-[var(--color-games-yellow)]">tie.</span>
          </>
        ) : (
          <>
            <span className="text-[var(--color-bone)]">{winnerLabel}</span>{" "}
            <span className="italic font-normal text-[var(--color-red)]">won.</span>
          </>
        )}
      </h1>

      {(verdict.series_score || verdict.series_story) && (
        <div className="mb-8 border-l-2 border-[var(--color-red)] pl-5 py-1">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2">
            Best-of-7 ·{" "}
            {verdict.series_score ? (
              <span className="text-[var(--color-bone)]">
                {seriesWinnerLabel
                  ? `${seriesWinnerLabel} ${verdict.series_score}`
                  : `Split ${verdict.series_score}`}
              </span>
            ) : (
              <span className="text-[var(--color-bone)]">Series</span>
            )}
          </div>
          {verdict.series_story && (
            <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1rem,1.4vw,1.2rem)] text-[var(--color-bone)] leading-snug">
              {verdict.series_story}
            </p>
          )}
        </div>
      )}

      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.4rem)] text-[var(--color-bone)] leading-snug mb-12">
        {verdict.verdict}
      </p>

      {verdict.slot_calls && verdict.slot_calls.length > 0 && (
        <div className="mb-12">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
            Slot by slot
          </div>
          <div className="flex flex-col gap-2">
            {verdict.slot_calls.map((c) => (
              <SlotCall
                key={c.slot}
                slot={c.slot}
                line={c.line}
                winner={c.winner}
                aName={aName}
                bName={bName}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RosterCard
          label={aName}
          accent="var(--color-red)"
          grade={verdict.a_grade}
          summary={verdict.a_summary}
          rounds={payload.rounds}
          side="a"
          isWinner={verdict.winner === "a"}
        />
        <RosterCard
          label={bName}
          accent="var(--color-games-yellow)"
          grade={verdict.b_grade}
          summary={verdict.b_summary}
          rounds={payload.rounds}
          side="b"
          isWinner={verdict.winner === "b"}
        />
      </div>
    </div>
  );
}

function SlotCall({
  slot,
  line,
  winner,
  aName,
  bName,
}: {
  slot: string;
  line: string;
  winner: WheelSide | "even";
  aName: string;
  bName: string;
}) {
  const winnerName = winner === "a" ? aName : winner === "b" ? bName : "Even";
  const accent =
    winner === "a"
      ? "var(--color-red)"
      : winner === "b"
      ? "var(--color-games-yellow)"
      : "var(--color-mute)";
  return (
    <div
      className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-4 flex flex-col sm:flex-row sm:items-baseline gap-3"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] shrink-0"
        style={{ color: accent }}
      >
        {slot} · {winnerName}
      </div>
      <p className="font-[family-name:var(--font-fraunces)] text-[0.95rem] text-[var(--color-bone)] leading-snug">
        {line}
      </p>
    </div>
  );
}

function RosterCard({
  label,
  accent,
  grade,
  summary,
  rounds,
  side,
  isWinner,
}: {
  label: string;
  accent: string;
  grade: string;
  summary: string;
  rounds: WheelRound[];
  side: WheelSide;
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
        {rounds.map((r) => {
          const pick = side === "a" ? r.pick_a : r.pick_b;
          const team = side === "a" ? r.a : r.b;
          if (!pick || !team) return null;
          return (
            <li
              key={r.index}
              className="flex items-baseline justify-between gap-2 px-3 py-2 rounded bg-[var(--color-line)]/30"
            >
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] w-7 shrink-0">
                  {r.slot}
                </span>
                <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] text-[var(--color-bone)] truncate">
                  {pick.player_name}
                </span>
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] uppercase tracking-[0.15em] text-[var(--color-mute)] truncate">
                {team.team.abbreviation}
                {team.rerolled && " ↻"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] text-[var(--color-mute)] leading-snug">
        {summary}
      </p>
    </div>
  );
}
