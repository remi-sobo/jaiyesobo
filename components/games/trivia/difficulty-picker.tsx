"use client";

import { TRIVIA_DIFFICULTIES, type TriviaDifficultyKey } from "@/lib/games/trivia-config";

type Props = {
  selected: TriviaDifficultyKey | null;
  onSelect: (d: TriviaDifficultyKey) => void;
};

const ORDER: TriviaDifficultyKey[] = ["easy", "medium", "hard", "extreme"];

export default function DifficultyPicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {ORDER.map((key) => {
        const cfg = TRIVIA_DIFFICULTIES[key];
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`relative text-left p-6 rounded border transition-all ${
              isSelected
                ? "bg-[var(--color-card)] border-[var(--color-games-yellow)] shadow-[0_0_0_1px_var(--color-games-yellow)]"
                : "bg-[var(--color-card)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
            }`}
          >
            <div className="flex gap-1 mb-5" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      n <= cfg.dots
                        ? isSelected
                          ? "var(--color-games-yellow)"
                          : "var(--color-bone)"
                        : "var(--color-line-strong)",
                  }}
                />
              ))}
            </div>
            <h3 className="font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight mb-2">
              {cfg.name}
            </h3>
            <p className="text-sm text-[var(--color-mute)] leading-relaxed">{cfg.description}</p>
          </button>
        );
      })}
    </div>
  );
}
