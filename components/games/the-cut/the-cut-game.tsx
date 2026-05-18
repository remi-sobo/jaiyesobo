"use client";

import { useCallback, useState } from "react";
import DifficultyPicker from "./difficulty-picker";
import CriterionBanner from "./criterion-banner";
import CutBoard from "./cut-board";
import VerdictReveal from "./verdict-reveal";
import TheCutResult from "./the-cut-result";
import { REQUIRED_KEEPS, type CutGameMode, type CutPlayResult } from "@/lib/games/the-cut";

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
  const [selected, setSelected] = useState<string[]>([]);
  const [locking, setLocking] = useState(false);
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
      const data = (await res.json()) as StartResponse & { error?: string; message?: string };
      if (!res.ok || !data.play_id) {
        setError(data.message ?? data.error ?? "Couldn't start a round.");
        setPhase("error");
        return;
      }
      setStart(data);
      setSelected([]);
      setResult(null);
      setShareToken(data.share_token);
      setPhase("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("error");
    }
  }, []);

  const toggleSelect = useCallback((name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      // Deselect-oldest behaviour when already at 4.
      if (prev.length >= REQUIRED_KEEPS) return [...prev.slice(1), name];
      return [...prev, name];
    });
  }, []);

  const lockIt = useCallback(async () => {
    if (!start || selected.length !== REQUIRED_KEEPS || locking) return;
    setLocking(true);
    try {
      const res = await fetch("/api/games/the-cut/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ play_id: start.play_id, kept_names: selected }),
      });
      const data = (await res.json()) as CutPlayResult & {
        error?: string;
        share_token?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Couldn't lock your cut.");
        setLocking(false);
        return;
      }
      setResult(data);
      if (data.share_token) setShareToken(data.share_token);
      setPhase("revealing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLocking(false);
    }
  }, [start, selected, locking]);

  const playAgain = useCallback(() => {
    setStart(null);
    setSelected([]);
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
        <CutBoard
          items={start.items}
          selected={selected}
          onToggle={toggleSelect}
          onLock={lockIt}
          busy={locking}
        />
      </>
    );
  }

  if (phase === "revealing" && result) {
    return (
      <VerdictReveal
        boardOrder={start.items.map((i) => i.name)}
        result={result}
        keptNames={selected}
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
