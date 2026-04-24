"use client";

export type Prompt = { who: string; question: string };

type Props = { prompts: Prompt[] };

export default function LessonDiscussion({ prompts }: Props) {
  return (
    <ul className="flex flex-col gap-3 list-none">
      {prompts.map((p, i) => (
        <li
          key={i}
          className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5"
        >
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-2">
            {p.who} →
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-snug text-[var(--color-warm-bone)]">
            {p.question}
          </p>
        </li>
      ))}
    </ul>
  );
}
