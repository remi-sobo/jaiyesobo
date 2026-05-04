"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  word: string | null;
};

export default function FoundCelebration({ word }: Props) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-24 flex justify-center z-40"
    >
      <AnimatePresence>
        {word && (
          <motion.div
            key={word}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.92 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-[family-name:var(--font-fraunces)] italic text-[clamp(2rem,5vw,3.25rem)] font-black tracking-tight"
            style={{
              color: "var(--color-red)",
              textShadow: "0 0 24px rgba(230, 57, 70, 0.55)",
            }}
          >
            {word}!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
