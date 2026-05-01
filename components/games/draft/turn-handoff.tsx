"use client";

import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  nextPlayerName: string;
  pickNumber: number; // 1..10
  onReady: () => void;
};

/**
 * Between-turn screen for the 2-player local draft. Tells the next player
 * it's their turn so the previous player can pass the keyboard. Tap-to-dismiss.
 */
export default function TurnHandoff({ team, nextPlayerName, pickNumber, onReady }: Props) {
  return (
    <div className="max-w-[640px] mx-auto px-6 pt-16 pb-20 text-center">
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-6"
        style={{ color: team.primary_color }}
      >
        Pick {pickNumber} of 10 · {team.abbreviation}
      </div>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-mute)] text-lg mb-3">
        Pass the keyboard.
      </p>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-[-0.02em] mb-10">
        <span className="text-[var(--color-bone)]">{nextPlayerName}</span>
        <span className="italic font-normal text-[var(--color-red)]">,</span> you&apos;re up.
      </h1>
      <button
        type="button"
        onClick={onReady}
        autoFocus
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
      >
        Ready →
      </button>
    </div>
  );
}
