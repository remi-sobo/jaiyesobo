"use client";

import { streakIcon } from "@/lib/games/trivia-config";

type Props = { streak: number };

export default function StreakDisplay({ streak }: Props) {
  const icon = streakIcon(streak);
  if (streak === 0) {
    return (
      <span className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
        Streak <span className="text-[var(--color-bone)]">0</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)]">
      <span>{icon}</span>
      <span>
        Streak <span className="text-[var(--color-bone)]">{streak}</span>
      </span>
    </span>
  );
}
