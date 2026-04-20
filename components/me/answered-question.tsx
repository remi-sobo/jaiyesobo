"use client";

import { useEffect } from "react";

type Props = { questionId: string; question: string; answer: string; answeredAt: string };

export default function AnsweredQuestion({ questionId, question, answer, answeredAt }: Props) {
  useEffect(() => {
    fetch(`/api/questions/${questionId}/seen`, { method: "POST" }).catch(() => {});
  }, [questionId]);

  return (
    <div className="mt-8 px-7 py-6 rounded bg-gradient-to-br from-[var(--color-warm-surface-2)] to-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-amber)]">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-amber)] mb-2">
        Dad answered your question
      </div>
      <div className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] mb-3 text-[0.95rem]">
        You asked: &ldquo;{question}&rdquo;
      </div>
      <div className="font-[family-name:var(--font-fraunces)] italic text-[1.1rem] leading-snug text-[var(--color-warm-bone)]">
        {answer}
      </div>
      <div className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        {new Date(answeredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>
    </div>
  );
}
