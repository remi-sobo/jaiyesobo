"use client";

type Item = { letter: string; text: string };

type Props = {
  number: number | string;
  forWho: string;
  question: React.ReactNode;
  leftItems: Item[]; // A/B/C/D with descriptions
  rightItems: { key: string; text: string }[]; // blanks to fill
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

export default function LessonMatching({
  number,
  forWho,
  question,
  leftItems,
  rightItems,
  values,
  onChange,
}: Props) {
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-4">
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

      <div className="grid md:grid-cols-2 gap-5 pt-2">
        <ul className="flex flex-col gap-2 list-none">
          {leftItems.map((it) => (
            <li key={it.letter} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] font-black text-sm shrink-0">
                {it.letter}
              </span>
              <span className="text-[var(--color-warm-bone)] text-[0.95rem] leading-snug pt-1.5">{it.text}</span>
            </li>
          ))}
        </ul>

        <ul className="flex flex-col gap-2 list-none">
          {rightItems.map((it) => (
            <li key={it.key} className="flex items-start gap-3">
              <input
                type="text"
                value={values[it.key] ?? ""}
                onChange={(e) =>
                  onChange({ ...values, [it.key]: e.target.value.toUpperCase().slice(0, 1) })
                }
                maxLength={1}
                placeholder="?"
                className="w-8 h-8 text-center bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded-sm font-[family-name:var(--font-jetbrains)] font-medium uppercase text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] shrink-0"
              />
              <span className="text-[var(--color-warm-bone)] text-[0.95rem] leading-snug pt-1.5">{it.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
