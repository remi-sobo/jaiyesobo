"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ShareModal from "@/components/games/share-modal";
import type { BlindRankResult } from "@/lib/games/blind-rank";

type Props = {
  result: BlindRankResult;
  shareToken: string | null;
  onPlayAgain: () => void;
};

export default function BlindRankResultView({ result, shareToken, onPlayAgain }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/games/share/${shareToken}`
      : "";

  return (
    <section className="px-6 lg:px-10 pb-24 pt-6 max-w-[920px] mx-auto relative">
      {result.score >= 4 && <Confetti />}

      <div className="text-center mb-10">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2">
          {result.topic_title}
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(4rem,12vw,8rem)] leading-none tracking-tight mb-4">
          <span style={{ color: scoreColor(result.score) }}>{result.score}</span>
          <span className="text-[var(--color-mute)] text-[0.55em]">/{result.total_slots}</span>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.4rem,3vw,2.4rem)] leading-snug text-[var(--color-bone)] max-w-[40ch] mx-auto">
          &ldquo;{result.verdict_line}&rdquo;
        </p>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5 mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-3">
          Side by side
        </div>
        <ul className="flex flex-col gap-2">
          {result.slot_results.map((sr) => {
            const fact = result.all_facts.find((f) => f.name === sr.ai_name);
            return (
              <li
                key={sr.slot}
                className={`grid grid-cols-[40px_1fr_1fr] gap-3 items-start p-3 rounded border ${
                  sr.correct
                    ? "border-[var(--color-games-green)] bg-[rgba(62,207,178,0.08)]"
                    : "border-[var(--color-red)] bg-[rgba(230,57,70,0.08)]"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full font-[family-name:var(--font-fraunces)] font-black ${
                    sr.correct
                      ? "bg-[var(--color-games-green)] text-[var(--color-black)]"
                      : "bg-[var(--color-red)] text-[var(--color-bone)]"
                  }`}
                >
                  {sr.slot}
                </div>
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-1">
                    You
                  </div>
                  <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                    {sr.player_name}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-1">
                    Truth
                  </div>
                  <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                    {sr.ai_name}
                  </div>
                  {fact && (
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] leading-relaxed text-[var(--color-mute)] mt-1">
                      {fact.fact}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
          Try another topic →
        </button>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={`${result.score}/${result.total_slots} on ${result.topic_title} · Blind Rank`}
        subtext={result.verdict_line}
      />
    </section>
  );
}

function scoreColor(score: number): string {
  if (score === 5) return "var(--color-games-green)";
  if (score >= 3) return "var(--color-games-yellow)";
  if (score === 0) return "var(--color-red)";
  return "var(--color-bone)";
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
    // One-shot animation: generate randomized confetti client-side to avoid
    // SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(
      Array.from({ length: 36 }, (_, i): Piece => ({
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
