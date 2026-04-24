"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Props = { studentNames: string; lessonTitle: string };

export default function LessonComplete({ studentNames, lessonTitle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md px-8 py-16 md:py-24 text-center overflow-hidden max-w-[760px] mx-auto mt-16"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none [background:radial-gradient(circle,rgba(230,57,70,0.14),transparent_60%)]" />

      <div className="relative z-[2] w-24 h-24 mx-auto mb-8 rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.14),0_20px_40px_-10px_rgba(230,57,70,0.3)]">
        <span className="w-9 h-5 border-l-[3px] border-b-[3px] border-[var(--color-bone)] rotate-[-45deg] translate-x-[3px] translate-y-[-4px]" />
      </div>

      <div className="relative z-[2] inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] px-3 py-1 rounded-sm bg-[rgba(74,222,128,0.15)] text-[var(--color-green)] mb-5">
        ✓ Submitted
      </div>

      <h1 className="relative z-[2] font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,5vw,3.5rem)] leading-none tracking-[-0.03em] mb-4">
        Mission <span className="italic font-normal text-[var(--color-red)]">complete!</span>
      </h1>

      <p className="relative z-[2] font-[family-name:var(--font-fraunces)] italic text-[1.15rem] leading-relaxed text-[var(--color-warm-bone)] max-w-[48ch] mx-auto mb-2">
        {studentNames ? `${studentNames} —` : "Nice work —"} you&apos;ve finished {lessonTitle}.
      </p>
      <p className="relative z-[2] text-[var(--color-warm-mute)] max-w-[44ch] mx-auto mb-10 text-[0.95rem]">
        Dad got your answers. He&apos;ll read them and might leave you a note.
      </p>

      <Link
        href="/me"
        className="relative z-[2] inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        Back to Today
      </Link>
    </motion.div>
  );
}
