"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import CoinFlip from "./coin-flip";
import DraftBoard from "./draft-board";
import FinalJudgment from "./final-judgment";
import ClaimLeaderboard from "./claim-leaderboard";
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
  | "starting"   // POST /start in flight
  | "coin"       // showing coin flip animation
  | "drafting"   // active draft
  | "judging"    // POST /judge in flight
  | "result"     // verdict shown
  | "error";

export default function DraftGame({ teamSlug, team }: Props) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [playId, setPlayId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [pool, setPool] = useState<DraftPoolPlayer[]>([]);
  const [starts, setStarts] = useState<DraftSide>("human");
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [verdict, setVerdict] = useState<DraftJudgement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [knownName, setKnownName] = useState<string | null>(null);

  const startedRef = useRef(false);

  // Kick off the game once on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setPhase("starting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/games/draft/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_slug: teamSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.play_id) {
        throw new Error(data?.error ?? "start_failed");
      }
      setPlayId(data.play_id);
      setShareToken(data.share_token ?? null);
      setStarts(data.starts);
      setPool(data.pool);
      setPicks([]);
      setKnownName(typeof data.known_name === "string" ? data.known_name : null);
      setPhase("coin");
    } catch (err) {
      console.error(err);
      setPhase("error");
      setErrorMsg("Couldn't start the draft. Refresh to try again.");
    }
  }

  // After coin flip animation, transition to drafting
  function onCoinDone() {
    setPhase("drafting");
  }

  const turn = useMemo(() => nextTurn(picks, starts), [picks, starts]);

  // When it's AI's turn, fire claude-pick automatically
  useEffect(() => {
    if (phase !== "drafting") return;
    if (turn !== "ai") return;
    if (aiThinking) return;
    if (!playId) return;
    void aiPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, aiThinking, playId]);

  async function aiPick() {
    if (!playId) return;
    setAiThinking(true);
    try {
      // Small artificial delay so the AI doesn't feel instant — gives the
      // kid a beat to see the board change.
      await new Promise((r) => setTimeout(r, 700));
      const res = await fetch("/api/games/draft/claude-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.pick) {
        throw new Error(data?.error ?? "ai_failed");
      }
      setPicks(data.picks as DraftPick[]);
    } catch (err) {
      console.error(err);
      setPhase("error");
      setErrorMsg("AI couldn't make a pick. Refresh to retry.");
    } finally {
      setAiThinking(false);
    }
  }

  const submitHumanPick = useCallback(
    async (player_id: string) => {
      if (!playId) return;
      const res = await fetch("/api/games/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId, player_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.picks) {
        throw new Error(data?.error ?? "pick_failed");
      }
      setPicks(data.picks as DraftPick[]);
    },
    [playId]
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

  // When draft finishes, fire judge
  useEffect(() => {
    if (phase !== "drafting") return;
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
      setPhase("error");
      setErrorMsg("Couldn't judge the draft. Refresh to retry.");
    }
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
    return <CoinFlip team={team} starts={starts} onDone={onCoinDone} />;
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
          humanName={knownName ?? undefined}
          aiName={knownName ? "Claude" : undefined}
        />
        {playId && <ClaimLeaderboard playId={playId} knownName={knownName} />}
        <div className="max-w-[760px] mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!shareToken}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 transition-colors"
          >
            Share your draft →
          </button>
          <a
            href="/games/draft"
            className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            Draft another team
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
              ? `I beat the AI drafting the ${team.city} ${team.name}.`
              : verdict.winner === "ai"
              ? `The AI beat me drafting the ${team.city} ${team.name}.`
              : `Tied the AI drafting the ${team.city} ${team.name}.`
          }
          subtext={`"${verdict.verdict}"`}
        />
      </>
    );
  }

  // Drafting
  return (
    <DraftBoard
      team={team}
      pool={pool}
      picks={picks}
      starts={starts}
      turn={turn}
      aiThinking={aiThinking}
      onPick={submitHumanPick}
      onFailedSearch={logFailedSearch}
    />
  );
}
