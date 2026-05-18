"use client";

import { useState } from "react";
import { SLOT_COUNT } from "@/lib/games/blind-rank";

type Props = {
  /** Item currently being placed (revealed this round). */
  currentItemName: string;
  /** Slot → item name already placed there. Slots not in the map are empty. */
  placedBySlot: Record<number, string>;
  /** Whether the parent has waited the 800ms "look" beat before showing the slots. */
  visible: boolean;
  onLock: (slot: number) => void;
  busy: boolean;
};

export default function SlotSelector({
  currentItemName,
  placedBySlot,
  visible,
  onLock,
  busy,
}: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);

  function requestLock(slot: number) {
    if (placedBySlot[slot] || busy) return;
    setConfirming(slot);
  }

  function cancel() {
    setConfirming(null);
  }

  function confirm() {
    if (confirming === null) return;
    onLock(confirming);
    setConfirming(null);
  }

  return (
    <section
      className={`px-6 lg:px-10 pb-12 max-w-[760px] mx-auto transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const slot = i + 1;
          const filledWith = placedBySlot[slot];
          const isFilled = !!filledWith;
          return (
            <button
              key={slot}
              type="button"
              disabled={isFilled || busy}
              onClick={() => requestLock(slot)}
              className={`group flex items-center gap-4 p-4 rounded-md border transition-all text-left ${
                isFilled
                  ? "bg-[var(--color-off-black)] border-[var(--color-line)] cursor-not-allowed opacity-70"
                  : "bg-[var(--color-card)] border-[var(--color-line-strong)] hover:border-[var(--color-red)] hover:-translate-y-0.5"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-[family-name:var(--font-fraunces)] font-black text-xl ${
                  isFilled
                    ? "bg-[var(--color-line)] text-[var(--color-mute)]"
                    : "bg-[var(--color-red)] text-[var(--color-bone)]"
                }`}
              >
                {slot}
              </div>
              <div className="flex-1 min-w-0">
                {isFilled ? (
                  <div className="font-[family-name:var(--font-fraunces)] text-base text-[var(--color-mute)] truncate">
                    {filledWith}
                  </div>
                ) : (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] group-hover:text-[var(--color-bone)] transition-colors">
                    Lock at slot #{slot}
                  </div>
                )}
              </div>
              {!isFilled && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)] group-hover:text-[var(--color-red)] transition-colors">
                  →
                </span>
              )}
            </button>
          );
        })}
      </div>

      {confirming !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={cancel}
          className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.85)] backdrop-blur-sm flex items-center justify-center px-4 py-10"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] bg-[var(--color-card)] border border-[var(--color-line)] rounded p-6"
            style={{ borderLeft: "3px solid var(--color-red)" }}
          >
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)] mb-2">
              Lock it in?
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-tight mb-3 leading-snug">
              <span className="text-[var(--color-bone)]">{currentItemName}</span>{" "}
              <span className="text-[var(--color-mute)]">at slot</span>{" "}
              <span className="text-[var(--color-red)]">#{confirming}</span>
            </h2>
            <p className="text-[var(--color-mute)] text-sm mb-6">
              No take-backs. This locks the item in slot #{confirming} for the
              rest of the round.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors disabled:opacity-50"
              >
                {busy ? "Locking…" : `Lock at #${confirming}`}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="border border-[var(--color-line-strong)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-6 py-3 rounded-sm hover:border-[var(--color-bone)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
