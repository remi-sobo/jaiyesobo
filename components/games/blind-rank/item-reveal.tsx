"use client";

import { motion } from "framer-motion";

type Props = {
  itemName: string;
  roundNumber: number;
  totalRounds: number;
  /** Pulsed once the slot selector becomes visible (parent shows it after a delay). */
  selectorReady: boolean;
};

export default function ItemReveal({
  itemName,
  roundNumber,
  totalRounds,
  selectorReady,
}: Props) {
  return (
    <section className="px-6 lg:px-10 pt-12 pb-6 max-w-[760px] mx-auto text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
        Round {roundNumber} of {totalRounds}
      </div>
      <motion.div
        key={itemName}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="bg-[var(--color-card)] border border-[var(--color-line-strong)] rounded-lg p-10 mb-6"
        style={{ borderLeft: "4px solid var(--color-red)" }}
      >
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)] mb-4">
          Now ranking
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,4.5rem)] leading-none tracking-tight text-[var(--color-bone)]">
          {itemName}
        </h2>
      </motion.div>
      <p
        className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] transition-opacity duration-500 ${
          selectorReady ? "opacity-100 text-[var(--color-mute)]" : "opacity-0"
        }`}
      >
        Pick a slot below. Once locked, you can&apos;t move it.
      </p>
    </section>
  );
}
