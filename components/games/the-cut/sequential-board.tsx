"use client";

import { motion, AnimatePresence } from "framer-motion";
import { REQUIRED_KEEPS, REQUIRED_CUTS, TOTAL_ITEMS } from "@/lib/games/the-cut";

type Props = {
  /** All 8 names in the order the server shuffled them. */
  allNames: string[];
  /** 0..7 — the item the player is currently deciding on. */
  currentIndex: number;
  /** Names the player has chosen to keep so far, in the order they were kept. */
  keptSoFar: string[];
  /** Names the player has chosen to cut so far, in the order they were cut. */
  cutSoFar: string[];
  onDecide: (decision: "keep" | "cut") => void;
  busy: boolean;
};

export default function SequentialBoard({
  allNames,
  currentIndex,
  keptSoFar,
  cutSoFar,
  onDecide,
  busy,
}: Props) {
  const currentName = allNames[currentIndex] ?? "";
  const keepsUsed = keptSoFar.length;
  const cutsUsed = cutSoFar.length;
  // Once 4 keeps used, remaining must be cuts. Once 4 cuts used, remaining
  // must be keeps. The player still taps a button — it's just that one is
  // disabled with a "forced" hint.
  const keepDisabled = keepsUsed >= REQUIRED_KEEPS;
  const cutDisabled = cutsUsed >= REQUIRED_CUTS;
  const itemNumber = currentIndex + 1;

  return (
    <section className="px-6 lg:px-10 pb-12 max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
            Item {itemNumber} of {TOTAL_ITEMS}
          </div>
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em]">
            <span className="text-[var(--color-games-green)]">
              Keeps {keepsUsed}/{REQUIRED_KEEPS}
            </span>
            <span className="text-[var(--color-mute)]">·</span>
            <span className="text-[var(--color-red)]">
              Cuts {cutsUsed}/{REQUIRED_CUTS}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL_ITEMS }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < currentIndex
                  ? "bg-[var(--color-bone)]"
                  : i === currentIndex
                  ? "bg-[var(--color-red)]"
                  : "bg-[var(--color-line-strong)]"
              }`}
            />
          ))}
        </div>

        {/* Item card */}
        <div className="relative h-[220px] sm:h-[260px] mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentName}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0 bg-[var(--color-card)] border border-[var(--color-line-strong)] rounded-lg flex flex-col items-center justify-center p-8 text-center"
              style={{ borderLeft: "4px solid var(--color-red)" }}
            >
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-4">
                Keep or cut?
              </div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,6vw,4rem)] leading-none tracking-tight text-[var(--color-bone)] max-w-[18ch]">
                {currentName}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Decision buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onDecide("keep")}
            disabled={keepDisabled || busy}
            className={`relative h-[72px] rounded-md font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.25em] transition-all disabled:cursor-not-allowed ${
              keepDisabled
                ? "bg-[var(--color-off-black)] text-[var(--color-mute)] border border-[var(--color-line)] opacity-50"
                : "bg-[var(--color-games-green)] text-[var(--color-black)] hover:brightness-110 active:scale-[0.98]"
            }`}
          >
            <span className="font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight block">
              Keep
            </span>
            {keepDisabled && (
              <span className="absolute bottom-1 left-0 right-0 text-[0.55rem] tracking-[0.2em]">
                slots full
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onDecide("cut")}
            disabled={cutDisabled || busy}
            className={`relative h-[72px] rounded-md font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.25em] transition-all disabled:cursor-not-allowed ${
              cutDisabled
                ? "bg-[var(--color-off-black)] text-[var(--color-mute)] border border-[var(--color-line)] opacity-50"
                : "bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-bright)] active:scale-[0.98]"
            }`}
          >
            <span className="font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight block">
              Cut
            </span>
            {cutDisabled && (
              <span className="absolute bottom-1 left-0 right-0 text-[0.55rem] tracking-[0.2em]">
                slots full
              </span>
            )}
          </button>
        </div>

        <p className="mt-4 text-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
          No take-backs.
        </p>
      </div>

      {/* History sidebar — critical in Hard mode for deducing the criterion */}
      <aside className="lg:sticky lg:top-6 bg-[var(--color-card)] border border-[var(--color-line)] rounded p-4 h-fit">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-3">
          So far
        </div>
        <HistoryGroup
          label="Kept"
          names={keptSoFar}
          accent="var(--color-games-green)"
          empty="No keeps yet"
        />
        <div className="h-3" />
        <HistoryGroup
          label="Cut"
          names={cutSoFar}
          accent="var(--color-red)"
          empty="No cuts yet"
        />
      </aside>
    </section>
  );
}

function HistoryGroup({
  label,
  names,
  accent,
  empty,
}: {
  label: string;
  names: string[];
  accent: string;
  empty: string;
}) {
  return (
    <div>
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] mb-2"
        style={{ color: accent }}
      >
        {label}
      </div>
      {names.length === 0 ? (
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-mute)] italic">
          {empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {names.map((n) => (
            <li
              key={n}
              className="font-[family-name:var(--font-fraunces)] text-[0.95rem] leading-snug text-[var(--color-bone)] flex items-center gap-2"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: accent }}
              />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
