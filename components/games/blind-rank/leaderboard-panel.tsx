"use client";

import { SLOT_COUNT } from "@/lib/games/blind-rank";

type Props = {
  topicTitle: string;
  topicSubtitle: string;
  roundNumber: number;
  totalRounds: number;
  placedBySlot: Record<number, string>;
};

export default function LeaderboardPanel({
  topicTitle,
  topicSubtitle,
  roundNumber,
  totalRounds,
  placedBySlot,
}: Props) {
  return (
    <aside className="lg:sticky lg:top-6 bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-2">
        Round {roundNumber} of {totalRounds}
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-tight tracking-tight mb-1">
        {topicTitle}
      </h3>
      {topicSubtitle && (
        <p className="text-[var(--color-mute)] text-xs leading-snug mb-4">{topicSubtitle}</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const slot = i + 1;
          const name = placedBySlot[slot];
          return (
            <li
              key={slot}
              className={`flex items-center gap-3 px-3 py-2 rounded border ${
                name
                  ? "bg-[var(--color-off-black)] border-[var(--color-line)]"
                  : "bg-transparent border-dashed border-[var(--color-line)]"
              }`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-[family-name:var(--font-fraunces)] font-black text-sm ${
                  name
                    ? "bg-[var(--color-red)] text-[var(--color-bone)]"
                    : "bg-[var(--color-line)] text-[var(--color-mute)]"
                }`}
              >
                {slot}
              </span>
              <span
                className={`font-[family-name:var(--font-fraunces)] text-sm leading-snug ${
                  name ? "text-[var(--color-bone)]" : "text-[var(--color-mute)] italic"
                }`}
              >
                {name ?? "empty"}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
