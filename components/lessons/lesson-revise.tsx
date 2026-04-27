"use client";

import LessonTextarea from "./lesson-textarea";
import LessonAIFeedback, { type AIFeedback } from "./lesson-ai-feedback";

type Props = {
  v1Text: string;
  feedback: AIFeedback;
  v2FieldPath: string;
};

export default function LessonRevise({ v1Text, feedback, v2FieldPath }: Props) {
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <LessonTextarea
          fieldPath={v2FieldPath}
          label="Your v2"
          helpText="Take what you wrote before, fold in the feedback, and try again. Don't start over — improve on v1."
          minRows={14}
          encouragement
        />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24 self-start">
        <details className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4 group" open>
          <summary className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] cursor-pointer list-none flex justify-between items-center">
            <span>Your v1</span>
            <span className="text-[var(--color-warm-dim)] group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <p className="mt-3 font-[family-name:var(--font-fraunces)] italic text-[0.9rem] leading-relaxed text-[var(--color-warm-bone)] max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {v1Text || "(empty)"}
          </p>
        </details>

        <LessonAIFeedback state="ready" feedback={feedback} />
      </div>
    </div>
  );
}
