"use client";

export type TimelineItem = {
  year: string;
  title: string;
  description: string;
  emoji: string;
  color?: string; // CSS color; defaults to history tan
};

type Props = { items: TimelineItem[] };

export default function LessonTimeline({ items }: Props) {
  return (
    <ol className="relative border-l-2 border-[var(--color-line-strong)] pl-6 md:pl-10 ml-3 md:ml-5 flex flex-col gap-6 list-none">
      {items.map((item, i) => {
        const color = item.color ?? "var(--color-history)";
        return (
          <li key={i} className="relative">
            <span
              className="absolute -left-[34px] md:-left-[46px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-[0.8rem] shadow-[0_0_0_4px_var(--color-warm-bg)]"
              style={{ background: color }}
              aria-hidden
            >
              {item.emoji}
            </span>
            <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 border-l-[3px]" style={{ borderLeftColor: color }}>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] mb-2" style={{ color }}>
                {item.year}
              </div>
              <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-xl leading-snug tracking-[-0.01em] mb-2">
                {item.title}
              </h4>
              <p className="text-[var(--color-warm-bone)] leading-relaxed text-[0.95rem]">{item.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
