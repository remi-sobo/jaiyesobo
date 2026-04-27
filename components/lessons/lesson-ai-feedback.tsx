"use client";

export type AIFeedback = {
  nailed: string[];
  missing: string[];
  try_this: string;
};

type Props =
  | { state: "loading" }
  | { state: "error"; message?: string; onRetry?: () => void }
  | { state: "ready"; feedback: AIFeedback };

export default function LessonAIFeedback(props: Props) {
  if (props.state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-red)] mb-3 animate-pulse">
          Reading your article carefully…
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] max-w-[40ch] text-[1rem]">
          Give me a few seconds. I&apos;m looking for what you nailed and what you can sharpen.
        </p>
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-red)] border-l-[3px] rounded p-6">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-2">
          AI took too long
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-snug mb-4">
          {props.message ?? "Show Dad — he can give you feedback."}
        </p>
        {props.onRetry && (
          <button
            type="button"
            onClick={props.onRetry}
            className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)] transition-colors"
          >
            Try AI again
          </button>
        )}
      </div>
    );
  }

  const { feedback } = props;
  return (
    <div className="flex flex-col gap-4">
      <FeedbackBlock
        accent="var(--color-green)"
        label="What you nailed"
        items={feedback.nailed}
      />
      <FeedbackBlock
        accent="var(--color-amber)"
        label="What's missing"
        items={feedback.missing}
      />
      <FeedbackBlock
        accent="var(--color-red)"
        label="Try this in v2"
        items={[feedback.try_this]}
      />
    </div>
  );
}

function FeedbackBlock({
  accent,
  label,
  items,
}: {
  accent: string;
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5"
      style={{ borderLeftColor: accent, borderLeftWidth: "3px" }}
    >
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] mb-2"
        style={{ color: accent }}
      >
        {label}
      </div>
      <ul className="flex flex-col gap-2 list-none">
        {items.map((it, i) => (
          <li
            key={i}
            className="font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-snug text-[var(--color-warm-bone)]"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
