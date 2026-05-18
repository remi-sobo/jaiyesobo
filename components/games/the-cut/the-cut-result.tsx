"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ShareModal from "@/components/games/share-modal";
import type { CutPlayResult } from "@/lib/games/the-cut";

type Props = {
  result: CutPlayResult;
  shareToken: string | null;
  onPlayAgain: () => void;
};

export default function TheCutResult({ result, shareToken, onPlayAgain }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const perfect = result.score === result.total_keeps;

  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/games/share/${shareToken}`
      : "";

  return (
    <section className="px-6 lg:px-10 pb-24 pt-4 max-w-[820px] mx-auto text-center relative">
      {perfect && <Confetti />}

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-3">
        {result.set_title}
      </div>

      <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(4rem,12vw,8rem)] leading-none tracking-tight mb-4">
        <span style={{ color: scoreColor(result.score) }}>{result.score}</span>
        <span className="text-[var(--color-mute)] text-[0.55em]">/{result.total_keeps}</span>
      </div>

      <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.5rem,3.5vw,2.6rem)] leading-snug text-[var(--color-bone)] mb-3">
        {result.verdict_line}
      </p>

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-12">
        Criterion · {result.criterion_summary}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="border border-[var(--color-line-strong)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          Play another cut →
        </button>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={`${result.score}/${result.total_keeps} on ${result.set_title} · The Cut`}
        subtext={result.verdict_line}
      />
    </section>
  );
}

function scoreColor(score: number): string {
  if (score === 4) return "var(--color-games-green)";
  if (score >= 2) return "var(--color-games-yellow)";
  return "var(--color-red)";
}

type Piece = {
  left: string;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
  spin: number;
};

const CONFETTI_COLORS = ["#E63946", "#F5C842", "#3ECFB2", "#F5F1EA"];

function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    // Generate randomized confetti once on mount. Math.random must run client-
    // side here to avoid SSR hydration mismatch — the linter rule against
    // setState-in-effect is intentionally bypassed for this one-shot animation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(
      Array.from({ length: 32 }, (_, i): Piece => ({
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 0.4,
        duration: 1.2 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        drift: (Math.random() - 0.5) * 120,
        spin: 360 + Math.random() * 360,
      }))
    );
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: [-20, 360],
            x: [0, p.drift],
            opacity: [0, 1, 1, 0],
            rotate: [0, p.spin],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
