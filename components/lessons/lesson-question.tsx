"use client";

type Props = {
  number: number | string;
  forWho: string;
  question: React.ReactNode;
  type?: "text" | "textarea";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
};

export default function LessonQuestion({
  number,
  forWho,
  question,
  type = "textarea",
  value,
  onChange,
  placeholder = "Type your answer…",
  minRows = 4,
}: Props) {
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
          Question {number}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] bg-[var(--color-warm-surface-2)] px-2 py-1 rounded-sm">
          {forWho}
        </div>
      </div>
      <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.1rem] leading-snug tracking-[-0.01em] text-[var(--color-bone)]">
        {question}
      </div>
      {type === "text" ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)]"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows}
          placeholder={placeholder}
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)] resize-y min-h-[100px] leading-relaxed"
        />
      )}
    </div>
  );
}
