"use client";

import type { WordEntry } from "@/lib/games/word-search";

type Props = {
  words: WordEntry[];
  foundWords: Set<string>;
};

export default function WordList({ words, foundWords }: Props) {
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5">
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          Word list
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
          {foundWords.size} / {words.length}
        </span>
      </div>
      <ul className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-1.5">
        {words.map((w) => {
          const isFound = foundWords.has(w.word);
          return (
            <li
              key={w.word}
              className={`font-[family-name:var(--font-jetbrains)] text-[0.85rem] uppercase tracking-[0.05em] transition-colors ${
                isFound
                  ? "text-[var(--color-red)] line-through decoration-2"
                  : "text-[var(--color-bone)]"
              }`}
            >
              {w.word}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
