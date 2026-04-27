"use client";

import { useDraftField } from "./draft-context";
import SaveIndicator from "./save-indicator";

type Props = {
  fieldPath: string;
  label: string;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  type?: "text" | "date";
  autoFocus?: boolean;
};

export default function LessonTextInput({
  fieldPath,
  label,
  placeholder,
  hint,
  maxLength = 200,
  type = "text",
  autoFocus,
}: Props) {
  const { value, setValue, flush, status, savedAt } = useDraftField(fieldPath);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`lf-${fieldPath}`}
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]"
        >
          {label}
        </label>
        <SaveIndicator status={status} savedAt={savedAt} />
      </div>
      <input
        id={`lf-${fieldPath}`}
        type={type}
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
        className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)]"
      />
      {hint && (
        <p className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-warm-mute)] leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
}
