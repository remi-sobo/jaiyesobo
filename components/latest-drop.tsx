"use client";
import { motion } from "framer-motion";

export default function LatestDrop() {
  return (
    <section className="px-6 lg:px-10 py-32 lg:py-40 border-t border-[var(--color-line)]">
      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-16">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        Latest Drop
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }} className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center max-w-[1400px] mx-auto">
        <div>
          <span className="inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] px-3 py-1.5 border border-[var(--color-red)] mb-8">
            First Drop Coming Soon
          </span>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-tight mb-6">
            First highlight reel <span className="italic font-normal text-[var(--color-red)]">coming soon.</span>
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-mute)] mb-8 max-w-[480px]">
            We&apos;re recording everything. The first big drop hits this season. Hit subscribe — wait, we don&apos;t have that yet either. Check back.
          </p>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] text-[var(--color-mute)]">
            First drop — TBD
          </div>
        </div>

        <div className="aspect-video bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded border border-[var(--color-line)] relative overflow-hidden order-first lg:order-last">
          <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-jetbrains)] text-[0.65rem] tracking-[0.25em] text-[var(--color-mute)]">
            Reel drops soon
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] rounded-full bg-[var(--color-red)]/40 flex items-center justify-center z-[2]">
            <span className="block w-0 h-0 border-l-[12px] border-l-[var(--color-bone)]/70 border-y-[7px] border-y-transparent ml-0.5" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
