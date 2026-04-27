"use client";

import { useDraftField } from "./draft-context";
import SaveIndicator from "./save-indicator";

type Props = {
  fieldPath: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  minRows?: number;
  encouragement?: boolean;
};

export default function LessonTextarea({
  fieldPath,
  label,
  placeholder,
  helpText,
  minRows = 4,
  encouragement,
}: Props) {
  const { value, setValue, flush, status, savedAt } = useDraftField(fieldPath);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label
          htmlFor={`lt-${fieldPath}`}
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]"
        >
          {label}
        </label>
        <SaveIndicator status={status} savedAt={savedAt} />
      </div>
      {helpText && (
        <p className="font-[family-name:var(--font-fraunces)] italic text-[0.9rem] text-[var(--color-warm-bone)] leading-snug">
          {helpText}
        </p>
      )}
      <textarea
        id={`lt-${fieldPath}`}
        value={value}
        rows={minRows}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
        className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)] resize-y leading-relaxed min-h-[120px]"
      />
      {encouragement && (
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
          {sentencesEncouragement(value)}
        </div>
      )}
    </div>
  );
}

function sentencesEncouragement(text: string): string {
  const count = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  if (count === 0) return "Start with one sentence.";
  if (count === 1) return "1 sentence. Keep going.";
  if (count < 4) return `${count} sentences. Keep going.`;
  return `${count} sentences. Nice.`;
}
