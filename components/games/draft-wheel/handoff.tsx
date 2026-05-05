"use client";

import type { WheelSlot } from "@/lib/games/draft-wheel";

type Props = {
  nextPlayerName: string;
  slot: WheelSlot;
  roundNumber: number;
  /** Optional: which team that player will be drafting from. Hidden until ready. */
  teamLabel?: string;
  onReady: () => void;
};

/**
 * Pass-the-device screen. Identical pattern to Draft Room's TurnHandoff —
 * fully unmounts the previous player's UI so there's no peeking.
 */
export default function WheelHandoff({
  nextPlayerName,
  slot,
  roundNumber,
  teamLabel,
  onReady,
}: Props) {
  return (
    <div className="max-w-[640px] mx-auto px-6 pt-16 pb-20 text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-6 text-[var(--color-games-yellow)]">
        Round {roundNumber} · {slot}
      </div>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-mute)] text-lg mb-3">
        Pass the device.
      </p>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-[-0.02em] mb-6">
        <span className="text-[var(--color-bone)]">{nextPlayerName}</span>
        <span className="italic font-normal text-[var(--color-red)]">,</span> you&apos;re up.
      </h1>
      {teamLabel && (
        <p className="text-[var(--color-mute)] mb-10">
          The wheel gave you the{" "}
          <span className="text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] italic">
            {teamLabel}
          </span>
          .
        </p>
      )}
      <button
        type="button"
        onClick={onReady}
        autoFocus
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
      >
        I&apos;m {nextPlayerName} — pick →
      </button>
    </div>
  );
}
