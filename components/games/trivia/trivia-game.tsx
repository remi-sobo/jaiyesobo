"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import DifficultyPicker from "./difficulty-picker";
import CountdownTimer from "./countdown-timer";
import QuestionCard, { type QuestionPublic } from "./question-card";
import StreakDisplay from "./streak-display";
import TriviaResult, { type Breakdown } from "./trivia-result";
import type { TriviaDifficultyKey } from "@/lib/games/trivia-config";

type Phase = "picking" | "loading" | "playing" | "finishing" | "done" | "error";

type Answer = {
  question_id: string;
  selected_index: number;
  correct: boolean;
  time_ms: number;
};

type FinishedResult = {
  score: number;
  total: number;
  difficulty: TriviaDifficultyKey;
  roast: string;
  streak: { current: number; best: number };
  breakdown: Breakdown[];
  share_token: string;
};

const QUESTION_DURATION_MS = 15_000;

export default function TriviaGame({ initialStreak }: { initialStreak: number }) {
  const [phase, setPhase] = useState<Phase>("picking");
  const [difficulty, setDifficulty] = useState<TriviaDifficultyKey | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [playId, setPlayId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questionStart, setQuestionStart] = useState<number>(Date.now());
  const [forceTimeout, setForceTimeout] = useState(false);
  const [result, setResult] = useState<FinishedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [streak, setStreak] = useState(initialStreak);

  // Stash play_id on window so QuestionCard can grab it without prop drilling
  useEffect(() => {
    if (playId) (window as Window & { __triviaPlayId?: string }).__triviaPlayId = playId;
  }, [playId]);

  async function startRound(d: TriviaDifficultyKey) {
    setDifficulty(d);
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/games/trivia/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: d }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "start_failed");
      setQuestions(payload.questions);
      setPlayId(payload.play_id);
      setShareToken(payload.share_token);
      setCurrentIdx(0);
      setAnswers([]);
      setForceTimeout(false);
      setQuestionStart(Date.now());
      setPhase("playing");
    } catch (err) {
      console.error(err);
      setError("Couldn't load this round. Try again.");
      setPhase("error");
    }
  }

  const handleAnswered = useCallback(
    (selectedIndex: number, correct: boolean) => {
      const q = questions[currentIdx];
      if (!q) return;
      setAnswers((prev) => [
        ...prev,
        {
          question_id: q.id,
          selected_index: selectedIndex,
          correct,
          time_ms: Date.now() - questionStart,
        },
      ]);
    },
    [questions, currentIdx, questionStart]
  );

  const handleTimeout = useCallback(() => {
    setForceTimeout(true);
  }, []);

  const advance = useCallback(async () => {
    if (currentIdx + 1 >= questions.length) {
      setPhase("finishing");
      try {
        const res = await fetch("/api/games/trivia/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ play_id: playId, answers }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error ?? "finish_failed");
        setResult(payload as FinishedResult);
        setStreak(payload.streak.current);
        setShareToken(payload.share_token);
        setPhase("done");
      } catch (err) {
        console.error(err);
        setError("Couldn't save your score. Tell Dad.");
        setPhase("error");
      }
      return;
    }
    setCurrentIdx((i) => i + 1);
    setForceTimeout(false);
    setQuestionStart(Date.now());
  }, [currentIdx, questions.length, playId, answers]);

  function reset() {
    setPhase("picking");
    setDifficulty(null);
    setQuestions([]);
    setPlayId(null);
    setShareToken(null);
    setCurrentIdx(0);
    setAnswers([]);
    setResult(null);
    setError(null);
  }

  if (phase === "loading") {
    return <LoadingState message="Pulling questions…" />;
  }

  if (phase === "finishing") {
    return <LoadingState message="Tallying the damage…" />;
  }

  if (phase === "error") {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-24 text-center">
        <p className="font-[family-name:var(--font-fraunces)] italic text-xl text-[var(--color-red-bright)] mb-6">
          {error ?? "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Reset
        </button>
      </div>
    );
  }

  if (phase === "done" && result) {
    const url =
      typeof window !== "undefined" && shareToken
        ? `${window.location.origin}/games/share/${shareToken}`
        : "";
    return (
      <>
        <TriviaResult
          score={result.score}
          total={result.total}
          difficulty={result.difficulty}
          roast={result.roast}
          streak={result.streak}
          breakdown={result.breakdown}
          onShare={() => setShareOpen(true)}
          onPlayAgain={reset}
        />
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={url}
          title={`I scored ${result.score}/10 on The Court Report`}
          subtext={`"${result.roast}"`}
        />
      </>
    );
  }

  if (phase === "playing") {
    const q = questions[currentIdx];
    return (
      <div className="max-w-[760px] mx-auto px-6 py-20 lg:py-24">
        <div className="mb-10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <StreakDisplay streak={streak} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
              {difficulty}
            </span>
          </div>
          <CountdownTimer
            durationMs={QUESTION_DURATION_MS}
            onTimeout={handleTimeout}
            resetKey={q.id}
          />
        </div>
        <QuestionCard
          question={q}
          questionNumber={currentIdx + 1}
          total={questions.length}
          onAnswered={handleAnswered}
          onAdvance={advance}
          forceTimeout={forceTimeout}
        />
      </div>
    );
  }

  // picking
  return (
    <div className="max-w-[900px] mx-auto px-6 py-20 lg:py-28">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-12">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-3">
            Pick your difficulty
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.01em]">
            How brave are you feeling?
          </h2>
        </div>
        <StreakDisplay streak={streak} />
      </div>

      <DifficultyPicker selected={difficulty} onSelect={(d) => setDifficulty(d)} />

      <div className="mt-10 flex sm:justify-end">
        <button
          type="button"
          onClick={() => difficulty && startRound(difficulty)}
          disabled={!difficulty}
          className="w-full sm:w-auto bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start round →
        </button>
      </div>
    </div>
  );
}
