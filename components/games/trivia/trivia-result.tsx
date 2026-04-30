"use client";

import { useState } from "react";
import { TRIVIA_DIFFICULTIES, streakIcon } from "@/lib/games/trivia-config";

export type Breakdown = {
  question_id: string;
  question: string;
  options: string[];
  correct_index: number;
  selected_index: number;
  correct: boolean;
  explanation: string;
  category: string;
  difficulty: string;
  time_ms: number;
};

type Props = {
  score: number;
  total: number;
  difficulty: keyof typeof TRIVIA_DIFFICULTIES;
  roast: string;
  streak: { current: number; best: number };
  breakdown: Breakdown[];
  onShare: () => void;
  onPlayAgain: () => void;
};

export default function TriviaResult({
  score,
  total,
  difficulty,
  roast,
  streak,
  breakdown,
  onShare,
  onPlayAgain,
}: Props) {
  return (
    <div className="max-w-[760px] mx-auto px-6 py-20 lg:py-28">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
        {TRIVIA_DIFFICULTIES[difficulty].name} · The Court Report
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] gap-12 items-start mb-14 pb-14 border-b border-[var(--color-line)]">
        <div className="flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(5rem,12vw,8rem)] leading-none tracking-[-0.04em] text-[var(--color-games-yellow)]">
            {score}
            <span className="text-[var(--color-mute)] font-normal">/{total}</span>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.25rem,2vw,1.6rem)] leading-snug text-[var(--color-bone)]">
            &ldquo;{roast}&rdquo;
          </p>
          {streak.current > 0 && (
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)]">
              {streakIcon(streak.current)} Streak: {streak.current}
              {streak.best > streak.current && (
                <span className="text-[var(--color-mute)] ml-3">Best: {streak.best}</span>
              )}
            </div>
          )}
          {streak.current === 0 && score < 8 && streak.best > 0 && (
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
              Streak reset · Best: {streak.best}
            </div>
          )}
        </div>
      </div>

      <Recap breakdown={breakdown} />

      <div className="flex flex-col sm:flex-row gap-3 mt-12">
        <button
          type="button"
          onClick={onShare}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Share your score →
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          Play again
        </button>
      </div>
    </div>
  );
}

function Recap({ breakdown }: { breakdown: Breakdown[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-5">
        Your round · {breakdown.length} questions
      </div>
      <ol className="flex flex-col gap-2 list-none">
        {breakdown.map((b, i) => {
          const isOpen = openIdx === i;
          const wasSkipped = b.selected_index === -1;
          const fg = b.correct
            ? "var(--color-games-green)"
            : wasSkipped
            ? "var(--color-mute)"
            : "var(--color-red)";
          const tag = b.correct ? "Right" : wasSkipped ? "Timed out" : "Wrong";
          return (
            <li
              key={b.question_id}
              className="bg-[var(--color-card)] border border-[var(--color-line)] rounded overflow-hidden"
              style={{ borderLeftColor: fg, borderLeftWidth: "2px" }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full text-left grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 hover:bg-[var(--color-off-black)]"
              >
                <span className="font-[family-name:var(--font-jetbrains)] font-medium text-sm text-[var(--color-mute)] w-6">
                  {i + 1}
                </span>
                <span className="font-[family-name:var(--font-fraunces)] text-[0.95rem] leading-snug truncate">
                  {b.question}
                </span>
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] whitespace-nowrap"
                  style={{ color: fg }}
                >
                  {tag}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--color-line)]">
                  {b.options.map((opt, j) => {
                    const isCorrect = j === b.correct_index;
                    const isYours = j === b.selected_index;
                    let style = "text-[var(--color-mute)]";
                    if (isCorrect) style = "text-[var(--color-games-green)]";
                    else if (isYours) style = "text-[var(--color-red)] line-through";
                    return (
                      <div key={j} className={`flex gap-3 items-baseline py-1 text-sm ${style}`}>
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-wider w-5">
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span className="font-[family-name:var(--font-fraunces)]">{opt}</span>
                      </div>
                    );
                  })}
                  {b.explanation && (
                    <p className="mt-3 pt-3 border-t border-[var(--color-line)] font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-bone)] leading-relaxed">
                      {b.explanation}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
