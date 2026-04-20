"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  section: string;
  number: string;
  tagline: string;
  description: string;
  coming: string[];
  accent?: string;
};

export default function ComingSoon({
  section,
  number,
  tagline,
  description,
  coming,
  accent = "var(--color-red)",
}: Props) {
  const reduced = useReducedMotion();
  const lastChar = section.slice(-1);
  const restChars = section.slice(0, -1);

  return (
    <main className="relative min-h-[100vh] pt-36 pb-24 px-6 lg:px-12 overflow-hidden bg-[var(--color-black)]">
      {!reduced && (
        <>
          <div className="absolute inset-y-0 left-0 w-[60%] pointer-events-none [background:radial-gradient(circle_at_0%_40%,rgba(230,57,70,0.07),transparent_55%)]" />
          <StreakLine delay={0.8} top="30%" duration={5.5} />
          <StreakLine delay={2.5} top="70%" duration={6.5} thin />
        </>
      )}

      {/* Vertical section label — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 0.4 }}
        className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[rgba(245,241,234,0.4)] gap-6 items-center"
      >
        <span>Section {number}</span>
        <span className="w-px h-8" style={{ background: accent }} />
        <span>{section}</span>
      </motion.div>

      <div className="relative max-w-[1100px] mx-auto lg:pl-24 flex flex-col items-start gap-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.2 }}
          className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)]"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          — The {section} wing —
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.4, ease: [0.19, 1, 0.22, 1] }}
          className="font-[family-name:var(--font-fraunces)] font-black leading-[0.85] tracking-[-0.045em] text-[clamp(5rem,13vw,12rem)]"
        >
          {restChars}
          <span className="italic font-normal" style={{ color: accent }}>
            {lastChar}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 0.8 }}
          className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.6vw,1.5rem)] text-[var(--color-bone)] leading-snug max-w-[40ch]"
        >
          {tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.0 }}
          className="text-[var(--color-mute)] leading-relaxed max-w-[60ch] text-[1rem]"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.2 }}
          className="w-full pt-6 mt-4 border-t border-[var(--color-line)] max-w-[680px]"
        >
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
            <span className="w-8 h-px" style={{ background: accent }} />
            Coming soon
          </div>
          <ul className="flex flex-col gap-3 list-none">
            {coming.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 1.3 + i * 0.1 }}
                className="font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-snug text-[var(--color-bone)] pl-6 relative before:content-['—'] before:absolute before:left-0 before:text-[var(--color-mute)]"
                dangerouslySetInnerHTML={{ __html: emphasize(item, accent) }}
              />
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.6 }}
          className="mt-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            ← Back home
          </Link>
        </motion.div>
      </div>
    </main>
  );
}

/**
 * Emphasize the most interesting word in a bullet by wrapping it in italic red.
 * Heuristic: pick the longest noun-ish word (length >= 5), prefer capitalized tokens.
 * Falls back to no emphasis if nothing obvious.
 */
function emphasize(text: string, accent: string): string {
  const tokens = text.split(/(\s+)/);
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!/[A-Za-z]/.test(t)) continue;
    const bare = t.replace(/[^A-Za-z]/g, "");
    if (bare.length < 5) continue;
    const cap = /^[A-Z]/.test(bare);
    const score = bare.length + (cap ? 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return escape(text);
  const before = tokens.slice(0, bestIdx).map(escape).join("");
  const after = tokens.slice(bestIdx + 1).map(escape).join("");
  return `${before}<em style="color: ${accent}; font-style: italic;">${escape(tokens[bestIdx])}</em>${after}`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function StreakLine({
  delay,
  top,
  duration,
  thin,
}: {
  delay: number;
  top: string;
  duration: number;
  thin?: boolean;
}) {
  return (
    <motion.div
      className="absolute left-[-30%] w-[160%] pointer-events-none rotate-[-12deg] origin-left"
      style={{ top }}
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: ["-100%", "-100%", "60%", "60%"], opacity: [0, 1, 0, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: 2.5,
        times: [0, 0.15, 0.6, 1],
        ease: [0.45, 0, 0.15, 1],
      }}
    >
      <div
        className={`bg-gradient-to-r from-transparent via-[var(--color-red-bright)] to-transparent ${
          thin ? "h-px opacity-40" : "h-0.5 opacity-60"
        }`}
      />
    </motion.div>
  );
}
