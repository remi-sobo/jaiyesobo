"use client";

import { motion } from "framer-motion";

type Props = {
  stepLabel: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
};

export default function LessonScreen({
  stepLabel,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = "Next →",
  nextDisabled,
  nextBusy,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
      className="max-w-[900px] mx-auto px-6 py-12 pb-32"
    >
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-red)] mb-4">
        {stepLabel}
      </div>
      <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] tracking-[-0.02em] mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[var(--color-warm-bone)] leading-relaxed max-w-[60ch] mb-10 text-[1.05rem]">
          {subtitle}
        </p>
      )}
      <div>{children}</div>

      {(onBack || onNext) && (
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--color-line)]">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-3 text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || nextBusy}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {nextBusy ? "…" : nextLabel}
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
