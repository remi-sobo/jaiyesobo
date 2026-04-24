"use client";

export type Activity = {
  emoji: string;
  title: string;
  description: string;
  value: string;
};

type Props = {
  activities: Activity[];
  selected: string | null;
  onChange: (value: string) => void;
};

export default function LessonActivityChoice({ activities, selected, onChange }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {activities.map((a) => {
        const isSelected = selected === a.value;
        return (
          <button
            key={a.value}
            type="button"
            onClick={() => onChange(a.value)}
            className={`relative text-left p-5 rounded border transition-all ${
              isSelected
                ? "bg-[var(--color-warm-surface-2)] border-[var(--color-red)] shadow-[0_0_0_1px_var(--color-red)]"
                : "bg-[var(--color-warm-surface)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
            }`}
          >
            {isSelected && (
              <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--color-red)] flex items-center justify-center text-[var(--color-bone)] text-xs">
                ✓
              </span>
            )}
            <div className="text-3xl mb-3">{a.emoji}</div>
            <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem] leading-snug tracking-[-0.01em] mb-1.5 pr-6">
              {a.title}
            </h4>
            <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed">{a.description}</p>
          </button>
        );
      })}
    </div>
  );
}
