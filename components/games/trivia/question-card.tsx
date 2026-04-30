"use client";

import { useEffect, useState } from "react";
import { TRIVIA_CATEGORIES } from "@/lib/games/trivia-config";

export type QuestionPublic = {
  id: string;
  question: string;
  options: string[];
  category: string;
  difficulty: string;
};

type Props = {
  question: QuestionPublic;
  questionNumber: number;
  total: number;
  onAnswered: (selectedIndex: number, correct: boolean, correctIndex: number, explanation: string) => void;
  onAdvance: () => void;
  forceTimeout?: boolean;
};

const AUTO_ADVANCE_MS = 4000;

export default function QuestionCard({
  question,
  questionNumber,
  total,
  onAnswered,
  onAdvance,
  forceTimeout,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoAt, setAutoAt] = useState<number | null>(null);

  // Reset on question change
  useEffect(() => {
    setSelected(null);
    setCorrectIndex(null);
    setExplanation(null);
    setBusy(false);
    setAutoAt(null);
  }, [question.id]);

  // Force timeout from parent: counts as wrong
  useEffect(() => {
    if (forceTimeout && selected === null && !busy) {
      submit(-1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceTimeout]);

  // Auto-advance after feedback shows
  useEffect(() => {
    if (correctIndex === null) return;
    const t = setTimeout(() => onAdvance(), AUTO_ADVANCE_MS);
    setAutoAt(Date.now() + AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [correctIndex, onAdvance]);

  async function submit(index: number, timedOut: boolean) {
    if (selected !== null || busy) return;
    setBusy(true);
    setSelected(index);
    try {
      const res = await fetch("/api/games/trivia/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          play_id: (window as Window & { __triviaPlayId?: string }).__triviaPlayId,
          question_id: question.id,
          selected_index: timedOut ? -1 : index,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "answer_failed");
      setCorrectIndex(payload.correct_index);
      setExplanation(payload.explanation);
      onAnswered(timedOut ? -1 : index, !!payload.correct, payload.correct_index, payload.explanation);
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }

  const cat = TRIVIA_CATEGORIES[question.category as keyof typeof TRIVIA_CATEGORIES];
  const showFeedback = correctIndex !== null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
        <span>
          Question <span className="text-[var(--color-games-yellow)]">{questionNumber}</span> / {total}
        </span>
        <span className="hidden sm:inline">{cat?.name ?? question.category} · {question.difficulty}</span>
      </div>

      <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] tracking-[-0.01em]">
        {question.question}
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = showFeedback && correctIndex === i;
          const isWrongSelection = showFeedback && isSelected && correctIndex !== i;

          let stateClass = "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-card)]";
          if (showFeedback && isCorrect) {
            stateClass =
              "border-[var(--color-games-green)] bg-[rgba(62,207,178,0.10)] text-[var(--color-bone)]";
          } else if (isWrongSelection) {
            stateClass = "border-[var(--color-red)] bg-[rgba(230,57,70,0.10)]";
          } else if (showFeedback) {
            stateClass = "border-[var(--color-line)] opacity-50";
          } else if (isSelected) {
            stateClass = "border-[var(--color-games-yellow)] bg-[var(--color-card)]";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => submit(i, false)}
              disabled={selected !== null || busy}
              className={`relative text-left bg-[var(--color-off-black)] border rounded p-4 sm:p-5 transition-all min-h-[60px] flex items-center gap-4 disabled:cursor-default ${stateClass}`}
            >
              <span className="font-[family-name:var(--font-jetbrains)] font-medium text-sm w-7 h-7 rounded-full border border-[var(--color-line)] flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-[family-name:var(--font-fraunces)] text-[1.05rem] leading-snug flex-1">
                {opt}
              </span>
              {showFeedback && isCorrect && (
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-games-green)]"
                  aria-hidden
                >
                  ✓ Correct
                </span>
              )}
              {isWrongSelection && (
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]"
                  aria-hidden
                >
                  ✗ Yours
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showFeedback && explanation && (
        <div className="bg-[var(--color-card)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-games-yellow)] rounded p-5">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)] mb-2">
            Why
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-relaxed text-[var(--color-bone)]">
            {explanation}
          </p>
        </div>
      )}

      {showFeedback && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAdvance}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            {questionNumber === total ? "See your score →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
