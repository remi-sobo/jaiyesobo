"use client";

import { useCallback, useState } from "react";
import DifficultyPicker from "./difficulty-picker";
import CriterionBanner from "./criterion-banner";
import SequentialBoard from "./sequential-board";
import VerdictReveal from "./verdict-reveal";
import TheCutResult from "./the-cut-result";
import {
  REQUIRED_KEEPS,
  REQUIRED_CUTS,
  TOTAL_ITEMS,
  type CutGameMode,
  type CutPlayResult,
} from "@/lib/games/the-cut";

type Phase = "pick" | "loading" | "playing" | "revealing" | "result" | "error";

type StartResponse = {
  play_id: string;
  share_token: string;
  set_title: string;
  category: string;
  mode: CutGameMode;
  prompt: string;
  criterion: string | null;
  items: { name: string }[];
};

export default function TheCutGame() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<StartResponse | null>(null);
  /** 0..TOTAL_ITEMS-1 — which item the player is deciding on. */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** Names the player has chosen to keep, in decision order. */
  const [keptNames, setKeptNames] = useState<string[]>([]);
  /** Names the player has chosen to cut, in decision order. */
  const [cutNamesState, setCutNamesState] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CutPlayResult | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const beginRound = useCallback(async (mode: CutGameMode) => {
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/games/the-cut/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as StartResponse & {
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.play_id) {
        setError(data.message ?? data.error ?? "Couldn't start a round.");
        setPhase("error");
        return;
      }
      setStart(data);
      setCurrentIndex(0);
      setKeptNames([]);
      setCutNamesState([]);
      setResult(null);
      setShareToken(data.share_token);
      setPhase("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("error");
    }
  }, []);

  const finishWithKeeps = useCallback(
    async (finalKeeps: string[]) => {
      if (!start || finalKeeps.length !== REQUIRED_KEEPS) return;
      setBusy(true);
      try {
        const res = await fetch("/api/games/the-cut/lock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ play_id: start.play_id, kept_names: finalKeeps }),
        });
        const data = (await res.json()) as CutPlayResult & {
          error?: string;
          share_token?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Couldn't lock your cut.");
          setBusy(false);
          return;
        }
        setResult(data);
        if (data.share_token) setShareToken(data.share_token);
        setPhase("revealing");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
      } finally {
        setBusy(false);
      }
    },
    [start]
  );

  const decide = useCallback(
    (decision: "keep" | "cut") => {
      if (!start || busy) return;
      const currentName = start.items[currentIndex]?.name;
      if (!currentName) return;
      // Enforce slot caps (the buttons should already be disabled, but be safe).
      if (decision === "keep" && keptNames.length >= REQUIRED_KEEPS) return;
      if (decision === "cut" && cutNamesState.length >= REQUIRED_CUTS) return;

      const nextKeeps =
        decision === "keep" ? [...keptNames, currentName] : keptNames;
      const nextCuts =
        decision === "cut" ? [...cutNamesState, currentName] : cutNamesState;
      setKeptNames(nextKeeps);
      setCutNamesState(nextCuts);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= TOTAL_ITEMS) {
        // All decided — kept slots should be full by construction.
        // Defensive: if somehow short, auto-fill remaining items as keeps so
        // the lock call succeeds.
        if (nextKeeps.length === REQUIRED_KEEPS) {
          finishWithKeeps(nextKeeps);
        } else {
          setError("Decision count mismatch — please reload.");
          setPhase("error");
        }
        return;
      }
      setCurrentIndex(nextIndex);
    },
    [start, currentIndex, keptNames, cutNamesState, busy, finishWithKeeps]
  );

  const playAgain = useCallback(() => {
    setStart(null);
    setCurrentIndex(0);
    setKeptNames([]);
    setCutNamesState([]);
    setResult(null);
    setShareToken(null);
    setError(null);
    setPhase("pick");
  }, []);

  if (phase === "error") {
    return (
      <section className="px-6 lg:px-10 py-24 max-w-[640px] mx-auto text-center">
        <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
          {error ?? "Something broke."}
        </h2>
        <button
          type="button"
          onClick={playAgain}
          className="mt-4 bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Try again
        </button>
      </section>
    );
  }

  if (phase === "pick") {
    return <DifficultyPicker onStart={beginRound} />;
  }

  if (phase === "loading" || !start) {
    return (
      <section className="px-6 lg:px-10 py-32 max-w-[640px] mx-auto text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] animate-pulse">
          Dealing the cut…
        </div>
      </section>
    );
  }

  if (phase === "playing") {
    return (
      <>
        <CriterionBanner
          mode={start.mode}
          prompt={start.prompt}
          setTitle={start.set_title}
        />
        <SequentialBoard
          allNames={start.items.map((i) => i.name)}
          currentIndex={currentIndex}
          keptSoFar={keptNames}
          cutSoFar={cutNamesState}
          onDecide={decide}
          busy={busy}
        />
      </>
    );
  }

  if (phase === "revealing" && result) {
    return (
      <VerdictReveal
        boardOrder={start.items.map((i) => i.name)}
        result={result}
        keptNames={keptNames}
        showCriterionTop={start.mode === "hard"}
        onFinished={() => setPhase("result")}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <TheCutResult result={result} shareToken={shareToken} onPlayAgain={playAgain} />
    );
  }

  return null;
}
