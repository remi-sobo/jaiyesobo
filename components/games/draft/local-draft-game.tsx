"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import LocalNameEntry from "./local-name-entry";
import CoinFlip from "./coin-flip";
import TurnHandoff from "./turn-handoff";
import DraftBoard from "./draft-board";
import FinalJudgment from "./final-judgment";
import {
  type DraftJudgement,
  type DraftPick,
  type DraftPoolPlayer,
  type DraftSide,
  TOTAL_PICKS,
  nextTurn,
} from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  teamSlug: string;
  team: DraftTeamPayload;
};

type Phase =
  | "names"      // entering player names
  | "starting"   // POST /local/start in flight
  | "coin"       // coin flip animation
  | "handoff"    // "pass to <next>" between turns
  | "drafting"   // active turn (current player picking)
  | "judging"    // POST /judge in flight
  | "result"
  | "error";

export default function LocalDraftGame({ teamSlug, team }: Props) {
  const [phase, setPhase] = useState<Phase>("names");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [playId, setPlayId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [pool, setPool] = useState<DraftPoolPlayer[]>([]);
  const [starts, setStarts] = useState<DraftSide>("human");
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [verdict, setVerdict] = useState<DraftJudgement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [p1, setP1] = useState("Player 1");
  const [p2, setP2] = useState("Player 2");

  // Map: side ("human"|"ai") → display name
  const nameFor = useCallback(
    (side: DraftSide) => (side === "human" ? p1 : p2),
    [p1, p2]
  );

  const turn = useMemo(() => nextTurn(picks, starts), [picks, starts]);

  // Open the handoff screen automatically when picks update mid-draft
  useEffect(() => {
    if (phase !== "drafting") return;
    if (picks.length === 0) return;
    if (picks.length >= TOTAL_PICKS) return;
    // After a successful pick, show handoff to next player
    setPhase("handoff");
  }, [picks.length, phase]);

  async function startDraft(p1Name: string, p2Name: string) {
    setPhase("starting");
    setErrorMsg(null);
    setP1(p1Name);
    setP2(p2Name);
    try {
      const res = await fetch("/api/games/draft/local/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_slug: teamSlug, p1_name: p1Name, p2_name: p2Name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.play_id) {
        throw new Error(data?.error ?? "start_failed");
      }
      setPlayId(data.play_id);
      setShareToken(data.share_token ?? null);
      setStarts(data.starts as DraftSide);
      setPool(data.pool as DraftPoolPlayer[]);
      setPicks([]);
      // Reset the names from the server (sanitized version)
      if (data.player_names) {
        setP1(data.player_names.human);
        setP2(data.player_names.ai);
      }
      setPhase("coin");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't start the draft.");
      setPhase("error");
    }
  }

  function onCoinDone() {
    // Flow into the first turn — show handoff so the starter knows it's their turn
    setPhase("handoff");
  }

  const submitPick = useCallback(
    async (player_id: string) => {
      if (!playId || turn === null) return;
      const res = await fetch("/api/games/draft/local/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId, player_id, side: turn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.picks) {
        throw new Error(data?.error ?? "pick_failed");
      }
      setPicks(data.picks as DraftPick[]);
    },
    [playId, turn]
  );

  const logFailedSearch = useCallback(
    (query: string) => {
      void fetch("/api/games/draft/log-failed-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_slug: teamSlug, query }),
      }).catch(() => {});
    },
    [teamSlug]
  );

  // After last pick → judge
  useEffect(() => {
    if (phase !== "handoff" && phase !== "drafting") return;
    if (picks.length !== TOTAL_PICKS) return;
    if (!playId) return;
    void judge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, picks.length, playId]);

  async function judge() {
    if (!playId) return;
    setPhase("judging");
    try {
      const res = await fetch("/api/games/draft/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verdict) {
        throw new Error(data?.error ?? "judge_failed");
      }
      setVerdict(data.verdict as DraftJudgement);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't judge the draft.");
      setPhase("error");
    }
  }

  if (phase === "names") {
    return <LocalNameEntry team={team} onSubmit={startDraft} />;
  }

  if (phase === "starting" || phase === "judging") {
    return <LoadingState />;
  }

  if (phase === "error") {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-24 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
          Something jammed up.
        </h1>
        <p className="text-[var(--color-mute)] mb-8">{errorMsg ?? "Refresh and try again."}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (phase === "coin") {
    return <CoinFlip team={team} starts={starts} onDone={onCoinDone} humanName={p1} aiName={p2} />;
  }

  if (phase === "handoff" && turn !== null) {
    return (
      <TurnHandoff
        team={team}
        nextPlayerName={nameFor(turn)}
        pickNumber={picks.length + 1}
        onReady={() => setPhase("drafting")}
      />
    );
  }

  if (phase === "result" && verdict) {
    const url = shareToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/share/${shareToken}`
      : "";
    return (
      <>
        <FinalJudgment
          team={team}
          picks={picks}
          starts={starts}
          verdict={verdict}
          humanName={p1}
          aiName={p2}
        />
        <div className="max-w-[760px] mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!shareToken}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 transition-colors"
          >
            Share this draft →
          </button>
          <a
            href="/games/draft?mode=friend"
            className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            New 2-player draft
          </a>
          <a
            href="/games/draft/leaderboard"
            className="bg-transparent text-[var(--color-mute)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:text-[var(--color-bone)] transition-colors text-center"
          >
            Record book →
          </a>
        </div>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={url}
          title={
            verdict.winner === "human"
              ? `${p1} won the ${team.city} ${team.name} draft.`
              : verdict.winner === "ai"
              ? `${p2} won the ${team.city} ${team.name} draft.`
              : `${p1} and ${p2} tied the ${team.city} ${team.name} draft.`
          }
          subtext={`"${verdict.verdict}"`}
        />
      </>
    );
  }

  // Active drafting — current player has the keyboard
  return (
    <DraftBoard
      team={team}
      pool={pool}
      picks={picks}
      starts={starts}
      turn={turn}
      aiThinking={false}
      onPick={submitPick}
      onFailedSearch={logFailedSearch}
      humanName={p1}
      aiName={p2}
      bothHuman
    />
  );
}
