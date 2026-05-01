"use client";

import { useMemo, useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import LineupRow from "./lineup-row";
import PlayerPool from "./player-pool";
import GoatResult from "./goat-result";
import {
  type GoatRosterVerdict,
  type RosterPick,
  type RosterPlayer,
  ROSTER_SIZE,
  isBalanced,
} from "@/lib/goat-roster";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  teamSlug: string;
  team: DraftTeamPayload;
  pool: RosterPlayer[];
};

type Phase = "building" | "submitting" | "judging" | "result" | "error";

export default function GoatRosterGame({ teamSlug, team, pool }: Props) {
  const [phase, setPhase] = useState<Phase>("building");
  const [picks, setPicks] = useState<RosterPick[]>([]);
  const [verdict, setVerdict] = useState<GoatRosterVerdict | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedIds = useMemo(() => new Set(picks.map((p) => p.player_id)), [picks]);
  const balanced = isBalanced(picks);
  const ready = picks.length === ROSTER_SIZE;

  function addPlayer(player: RosterPlayer) {
    if (pickedIds.has(player.id)) return;
    if (picks.length >= ROSTER_SIZE) return;
    setPicks((prev) => [
      ...prev,
      {
        player_id: player.id,
        player_name: player.name,
        primary_position: player.primary_position,
      },
    ]);
  }

  function removePick(player_id: string) {
    setPicks((prev) => prev.filter((p) => p.player_id !== player_id));
  }

  function clearAll() {
    setPicks([]);
  }

  async function submit() {
    if (!ready || phase !== "building") return;
    setPhase("submitting");
    setError(null);
    try {
      const playRes = await fetch("/api/games/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: "goat-roster",
          payload: {
            team_slug: teamSlug,
            team,
            picks,
          },
        }),
      });
      const playData = await playRes.json().catch(() => ({}));
      if (!playRes.ok || !playData?.play_id) {
        throw new Error(playData?.error ?? "play_failed");
      }
      setShareToken(playData.share_token ?? null);
      setPhase("judging");

      const judgeRes = await fetch("/api/games/goat-roster/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playData.play_id }),
      });
      const judgeData = await judgeRes.json().catch(() => ({}));
      if (!judgeRes.ok || !judgeData?.verdict) {
        throw new Error(judgeData?.error ?? "judge_failed");
      }
      setVerdict(judgeData.verdict as GoatRosterVerdict);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setError("AI couldn't score that one. Try again.");
      setPhase("error");
    }
  }

  if (phase === "submitting" || phase === "judging") {
    return <LoadingState />;
  }

  if (phase === "result" && verdict) {
    const url = shareToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/share/${shareToken}`
      : "";
    return (
      <>
        <GoatResult team={team} picks={picks} verdict={verdict} />
        <div className="max-w-[760px] mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!shareToken}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 transition-colors"
          >
            Share your roster →
          </button>
          <a
            href="/games/goat-roster"
            className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            Build another
          </a>
        </div>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={url}
          title={`I scored ${verdict.score}/100 building the ${team.city} ${team.name} GOAT Roster.`}
          subtext={`"${verdict.take}"`}
        />
      </>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
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
        <div className="font-[family-name:var(--font-fraunces)] italic text-base text-[var(--color-bone)]">
          {picks.length} of {ROSTER_SIZE} picked
        </div>
      </div>

      <LineupRow
        team={team}
        picks={picks}
        onRemove={removePick}
        onClear={clearAll}
        balanced={balanced}
      />

      <div className="mt-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          Pool · {pool.length} players
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {ready ? "Get your score →" : `Pick ${ROSTER_SIZE - picks.length} more`}
        </button>
      </div>

      <PlayerPool pool={pool} pickedIds={pickedIds} onAdd={addPlayer} disabled={picks.length >= ROSTER_SIZE} />

      {error && phase === "error" && (
        <div className="mt-6 px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
          {error}{" "}
          <button onClick={() => setPhase("building")} className="underline ml-2">
            try again
          </button>
        </div>
      )}
    </div>
  );
}
