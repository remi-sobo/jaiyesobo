"use client";

import { useMemo } from "react";
import PickInput from "./pick-input";
import RosterColumn from "./roster-column";
import {
  type DraftPick,
  type DraftPoolPlayer,
  type DraftSide,
  TOTAL_PICKS,
  roundFor,
} from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  pool: DraftPoolPlayer[];
  picks: DraftPick[];
  starts: DraftSide;
  turn: DraftSide | null;
  aiThinking: boolean;
  onPick: (player_id: string) => Promise<void>;
  onFailedSearch: (query: string) => void;
  /** When provided, used instead of "You"/"Claude" labels. */
  humanName?: string;
  aiName?: string;
  /** True in vs-friend mode — both turns show input, no AI thinking. */
  bothHuman?: boolean;
};

export default function DraftBoard({
  team,
  pool,
  picks,
  starts,
  turn,
  aiThinking,
  onPick,
  onFailedSearch,
  humanName,
  aiName,
  bothHuman,
}: Props) {
  const human = picks.filter((p) => p.side === "human");
  const ai = picks.filter((p) => p.side === "ai");
  const excludeIds = useMemo(() => new Set(picks.map((p) => p.player_id)), [picks]);
  const round = roundFor(picks.length);
  const pickNum = picks.length + 1;
  const aiCanRoast = !bothHuman && picks.length > 0 && picks[picks.length - 1].side === "ai";
  const lastAiPick = aiCanRoast ? picks[picks.length - 1] : null;
  const humanLabel = humanName ?? "You";
  const aiLabel = aiName ?? "Claude";

  const turnLabel = (() => {
    if (turn === null) return "Draft complete.";
    const name = turn === "human" ? humanLabel : aiLabel;
    if (bothHuman) return `${name} — your pick.`;
    if (turn === "human") return "Your pick.";
    return aiThinking ? "Claude is thinking…" : "Claude is up.";
  })();

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-5 border-b border-[var(--color-line)]">
        <div>
          <div
            className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.3em] mb-1.5"
            style={{ color: team.primary_color }}
          >
            {team.abbreviation} · all-time pool
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.5rem,3vw,2.25rem)] leading-tight tracking-[-0.02em]">
            {team.city} {team.name}
          </h2>
        </div>
        <div className="flex flex-col sm:items-end gap-1">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
            Round {round} of 5 · pick {pickNum} of {TOTAL_PICKS}
          </div>
          <div className="font-[family-name:var(--font-fraunces)] italic text-base text-[var(--color-bone)]">
            {turnLabel}
          </div>
        </div>
      </div>

      {/* Last AI pick callout (vs-AI only) */}
      {lastAiPick && (
        <div className="mb-6 px-4 py-3 rounded border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-1">
            {aiLabel} just picked
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg text-[var(--color-bone)] leading-tight">
            {lastAiPick.player_name}{" "}
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
              ({lastAiPick.primary_position})
            </span>
          </div>
          {lastAiPick.reason && (
            <p className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] text-[var(--color-mute)] mt-1 leading-snug">
              &ldquo;{lastAiPick.reason}&rdquo;
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5 mb-6">
        <RosterColumn
          label={humanLabel}
          accent={team.primary_color}
          picks={human}
          isActive={turn === "human"}
        />
        <RosterColumn
          label={aiLabel}
          accent="var(--color-games-yellow)"
          picks={ai}
          isActive={turn === "ai"}
          isThinking={!bothHuman && aiThinking}
        />
      </div>

      {turn !== null && (bothHuman || turn === "human") && (
        <PickInput
          pool={pool}
          excludeIds={excludeIds}
          disabled={false}
          onPick={onPick}
          onFailedSearch={onFailedSearch}
        />
      )}

      {!bothHuman && turn === "ai" && (
        <div className="px-4 py-3 rounded border border-dashed border-[var(--color-line)] bg-[var(--color-card)] text-center font-[family-name:var(--font-fraunces)] italic text-[var(--color-mute)]">
          Waiting on {aiLabel}…
        </div>
      )}
    </div>
  );
}
