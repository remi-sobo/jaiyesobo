"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import type { DraftPoolPlayer } from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";
import {
  type DraftWheelVerdict,
  type WheelRound,
  type WheelSide,
  type WheelTeamAssignment,
  TOTAL_ROUNDS,
  buildInitialRounds,
} from "@/lib/games/draft-wheel";
import DraftWheelStart from "./start";
import WheelSpin from "./wheel-spin";
import WheelHandoff from "./handoff";
import PickScreen from "./pick-screen";
import RoundComplete from "./round-complete";
import DraftWheelFinalVerdict from "./final-verdict";

type Phase =
  | "names"        // both players type names
  | "starting"     // POST /start in flight
  | "spinning"     // WheelSpin animation for this round
  | "handoff_a"    // pass-the-device → player A
  | "picking_a"    // A's PickScreen
  | "handoff_b"    // pass-the-device → player B
  | "picking_b"    // B's PickScreen
  | "round_done"   // both picks locked, show RoundComplete
  | "judging"      // POST /judge in flight
  | "result"       // FinalVerdict + share
  | "error";

type Props = {
  /** Optional pre-fill for player A's name (carried from a prior session). */
  initialAName?: string | null;
};

export default function DraftWheelGame({ initialAName }: Props) {
  const [phase, setPhase] = useState<Phase>("names");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [playId, setPlayId] = useState<string | null>(null);
  const [shareTokenStr, setShareTokenStr] = useState<string | null>(null);

  const [playerNames, setPlayerNames] = useState<{ a: string; b: string }>({
    a: "Player 1",
    b: "Player 2",
  });
  const [availableTeams, setAvailableTeams] = useState<{ slug: string; team: DraftTeamPayload }[]>([]);

  // Game state — mirrored from the server. Server is source of truth, client
  // updates this on each successful POST.
  const [rounds, setRounds] = useState<WheelRound[]>(buildInitialRounds());
  const [usedSlugs, setUsedSlugs] = useState<string[]>([]);
  const [rerollsAvailable, setRerollsAvailable] = useState({ a: true, b: true });

  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [poolForActive, setPoolForActive] = useState<DraftPoolPlayer[]>([]);
  const [poolLoadingFor, setPoolLoadingFor] = useState<WheelSide | null>(null);

  const [verdict, setVerdict] = useState<DraftWheelVerdict | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const teamPayloads = useMemo(() => availableTeams.map((t) => t.team), [availableTeams]);

  /* ----------------------------- start game ----------------------------- */

  async function startGame(a: string, b: string) {
    setPhase("starting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/games/draft-wheel/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1_name: a, p2_name: b }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.play_id) {
        throw new Error(data?.error ?? "start_failed");
      }
      setPlayId(data.play_id);
      setShareTokenStr(data.share_token ?? null);
      setPlayerNames(data.player_names);
      setAvailableTeams(data.available_teams);
      setRounds(buildInitialRounds());
      setUsedSlugs([]);
      setRerollsAvailable({ a: true, b: true });
      setActiveRoundIdx(0);
      // Spin the wheel for round 0 (server will assign teams).
      await spinForRound(0, data.play_id);
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't start the game.");
      setPhase("error");
    }
  }

  /* ----------------------------- spin ----------------------------- */

  async function spinForRound(idx: number, pid: string) {
    try {
      const res = await fetch("/api/games/draft-wheel/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: pid, round_index: idx }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.a || !data?.b) {
        throw new Error(data?.error ?? "spin_failed");
      }
      setRounds((prev) =>
        prev.map((r, i) =>
          i === idx ? { ...r, a: data.a as WheelTeamAssignment, b: data.b as WheelTeamAssignment } : r
        )
      );
      setUsedSlugs((u) => Array.from(new Set([...u, data.a.team_slug, data.b.team_slug])));
      setActiveRoundIdx(idx);
      setPhase("spinning");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't spin the wheel.");
      setPhase("error");
    }
  }

  /* ----------------------------- pool fetch ----------------------------- */

  async function loadPool(side: WheelSide) {
    if (!playId) return;
    setPoolLoadingFor(side);
    try {
      const res = await fetch("/api/games/draft-wheel/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId, round_index: activeRoundIdx, side }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data?.pool)) {
        throw new Error(data?.error ?? "pool_failed");
      }
      setPoolForActive(data.pool as DraftPoolPlayer[]);
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't load the team's pool.");
      setPhase("error");
    } finally {
      setPoolLoadingFor(null);
    }
  }

  /* ----------------------------- pick ----------------------------- */

  async function submitPick(side: WheelSide, player_id: string) {
    if (!playId) return;
    const res = await fetch("/api/games/draft-wheel/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        play_id: playId,
        round_index: activeRoundIdx,
        side,
        player_id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.round) {
      throw new Error(data?.error ?? "pick_failed");
    }
    const updated = data.round as WheelRound;
    setRounds((prev) => prev.map((r, i) => (i === activeRoundIdx ? updated : r)));
    // Advance: if A just picked, hand off to B; if B picked, round done.
    if (side === "a") {
      setPhase("handoff_b");
    } else {
      setPhase("round_done");
    }
  }

  /* ----------------------------- reroll ----------------------------- */

  async function submitReroll(side: WheelSide) {
    if (!playId) return;
    const res = await fetch("/api/games/draft-wheel/reroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        play_id: playId,
        round_index: activeRoundIdx,
        side,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.assignment) {
      throw new Error(data?.error ?? "reroll_failed");
    }
    const newAssignment = data.assignment as WheelTeamAssignment;
    setRounds((prev) =>
      prev.map((r, i) => {
        if (i !== activeRoundIdx) return r;
        return side === "a" ? { ...r, a: newAssignment } : { ...r, b: newAssignment };
      })
    );
    setUsedSlugs((u) => Array.from(new Set([...u, newAssignment.team_slug])));
    setRerollsAvailable(data.rerolls_available as { a: boolean; b: boolean });
    // Refresh pool for the side that just re-rolled.
    await loadPool(side);
  }

  /* ----------------------------- judge ----------------------------- */

  async function judge() {
    if (!playId) return;
    setPhase("judging");
    try {
      const res = await fetch("/api/games/draft-wheel/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verdict) {
        throw new Error(data?.error ?? "judge_failed");
      }
      setVerdict(data.verdict as DraftWheelVerdict);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't judge the game.");
      setPhase("error");
    }
  }

  /* ---------------- effect: load pool when entering pick phase ----------------
   * The pool fetch is deferred via a microtask so the loadPool() function
   * (which calls setState immediately to flip a "loading" flag) doesn't fire
   * synchronously inside this effect's body. */

  useEffect(() => {
    if (phase !== "picking_a" && phase !== "picking_b") return;
    const side: WheelSide = phase === "picking_a" ? "a" : "b";
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadPool(side);
    });
    return () => {
      cancelled = true;
    };
    // loadPool is a stable closure over the relevant state at this point;
    // we intentionally only re-run when phase or active round changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeRoundIdx]);

  /* ----------------------------- transitions ----------------------------- */

  function onSpinSettled() {
    // After the wheel-spin animation, hand off to A.
    setPhase("handoff_a");
  }

  function onContinueAfterRound() {
    if (activeRoundIdx + 1 >= TOTAL_ROUNDS) {
      void judge();
      return;
    }
    if (!playId) return;
    void spinForRound(activeRoundIdx + 1, playId);
  }

  /* ----------------------------- renders ----------------------------- */

  if (phase === "names") {
    return <DraftWheelStart onSubmit={startGame} initialA={initialAName ?? ""} />;
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

  const round = rounds[activeRoundIdx];

  if (phase === "spinning") {
    if (!round.a || !round.b) return <LoadingState />;
    return (
      <WheelSpin
        slot={round.slot}
        position={round.position}
        roundNumber={activeRoundIdx + 1}
        aName={playerNames.a}
        bName={playerNames.b}
        teamA={round.a.team}
        teamB={round.b.team}
        spinPool={teamPayloads}
        onSettled={onSpinSettled}
      />
    );
  }

  if (phase === "handoff_a" && round.a) {
    return (
      <WheelHandoff
        nextPlayerName={playerNames.a}
        slot={round.slot}
        roundNumber={activeRoundIdx + 1}
        teamLabel={`${round.a.team.city} ${round.a.team.name}`}
        onReady={() => setPhase("picking_a")}
      />
    );
  }
  if (phase === "handoff_b" && round.b) {
    return (
      <WheelHandoff
        nextPlayerName={playerNames.b}
        slot={round.slot}
        roundNumber={activeRoundIdx + 1}
        teamLabel={`${round.b.team.city} ${round.b.team.name}`}
        onReady={() => setPhase("picking_b")}
      />
    );
  }

  if (phase === "picking_a" && round.a) {
    if (poolLoadingFor === "a") return <LoadingState />;
    return (
      <PickScreen
        playerName={playerNames.a}
        slot={round.slot}
        position={round.position}
        team={round.a.team}
        rerolled={!!round.a.rerolled}
        pool={poolForActive}
        rerollAvailable={rerollsAvailable.a}
        onPick={(id) => submitPick("a", id)}
        onReroll={() => submitReroll("a")}
      />
    );
  }
  if (phase === "picking_b" && round.b) {
    if (poolLoadingFor === "b") return <LoadingState />;
    return (
      <PickScreen
        playerName={playerNames.b}
        slot={round.slot}
        position={round.position}
        team={round.b.team}
        rerolled={!!round.b.rerolled}
        pool={poolForActive}
        rerollAvailable={rerollsAvailable.b}
        onPick={(id) => submitPick("b", id)}
        onReroll={() => submitReroll("b")}
      />
    );
  }

  if (phase === "round_done") {
    return (
      <RoundComplete
        round={round}
        rounds={rounds}
        names={playerNames}
        isFinalRound={activeRoundIdx + 1 >= TOTAL_ROUNDS}
        onContinue={onContinueAfterRound}
      />
    );
  }

  if (phase === "result" && verdict) {
    const url = shareTokenStr
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/share/${shareTokenStr}`
      : "";
    return (
      <>
        <DraftWheelFinalVerdict
          payload={{
            player_names: playerNames,
            rounds,
            rerolls_available: rerollsAvailable,
            used_team_slugs: usedSlugs,
          }}
          verdict={verdict}
        />
        <div className="max-w-[760px] mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!shareTokenStr}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 transition-colors"
          >
            Share this matchup →
          </button>
          <a
            href="/games/draft-wheel"
            className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            Spin a new game
          </a>
          <a
            href="/games"
            className="bg-transparent text-[var(--color-mute)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:text-[var(--color-bone)] transition-colors text-center"
          >
            Back to games
          </a>
        </div>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={url}
          title={
            verdict.winner === "a"
              ? `${playerNames.a} won the Draft Wheel.`
              : verdict.winner === "b"
              ? `${playerNames.b} won the Draft Wheel.`
              : `${playerNames.a} and ${playerNames.b} tied the Draft Wheel.`
          }
          subtext={`"${verdict.verdict}"`}
        />
      </>
    );
  }

  return <LoadingState />;
}
