"use client";

import { motion } from "framer-motion";

type Props = {
  tag: string;
  title: string;
  titleAccent: string;
  description: string;
  missionItems: string[];
  onStart: () => void;
};

export default function LessonHero({ tag, title, titleAccent, description, missionItems, onStart }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
      className="max-w-[900px] mx-auto px-6 py-16 md:py-24"
    >
      <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)] mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] animate-pulse" />
        {tag}
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black leading-[0.9] tracking-[-0.03em] text-[clamp(2.5rem,7vw,5rem)] mb-6">
        {title} <span className="italic font-normal text-[var(--color-red)]">{titleAccent}</span>
      </h1>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.4vw,1.25rem)] text-[var(--color-warm-bone)] leading-snug max-w-[52ch] mb-10">
        {description}
      </p>

      <div className="flex flex-wrap gap-2 mb-10">
        {missionItems.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-full px-4 py-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-warm-bone)]"
          >
            <span className="w-1 h-1 rounded-full bg-[var(--color-red)]" />
            {item}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center gap-3 bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        Start Mission <span className="text-base">→</span>
      </button>
    </motion.section>
  );
}
