"use client";
import { motion } from "framer-motion";

export default function LatestDrop() {
  return (
    <section className="px-6 lg:px-10 py-32 lg:py-40 border-t border-[var(--color-line)]">
      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-16">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        Latest Drop
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }} whileHover={{ y: -4 }} className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center cursor-pointer max-w-[1400px] mx-auto">
        <div>
          <span className="inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] px-3 py-1.5 border border-[var(--color-red)] mb-8">
            Ball · New
          </span>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-tight mb-6">
            First tournament of the season.
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-mute)] mb-8 max-w-[480px]">
            Playoff opener against the Menlo Mavericks. My first bucket came off a steal at the top of the key. We ran a press the whole second half.
          </p>
          <div className="flex gap-10 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-wider text-[var(--color-mute)]">
            <span>Date<strong className="block text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] font-semibold text-base mt-2">Mar 15</strong></span>
            <span>Result<strong className="block text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] font-semibold text-base mt-2">W 42–28</strong></span>
            <span>Points<strong className="block text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] font-semibold text-base mt-2">14</strong></span>
          </div>
        </div>

        <div className="aspect-video bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded border border-[var(--color-line)] relative overflow-hidden group order-first lg:order-last">
          <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-jetbrains)] text-[0.65rem] tracking-[0.2em] text-[var(--color-mute)]">
            PLACEHOLDER · UPLOAD HIGHLIGHT
          </div>
          <motion.div whileHover={{ scale: 1.1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-[var(--color-red)] flex items-center justify-center z-[2]">
            <span className="block w-0 h-0 border-l-[16px] border-l-[var(--color-bone)] border-y-[10px] border-y-transparent ml-1" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
