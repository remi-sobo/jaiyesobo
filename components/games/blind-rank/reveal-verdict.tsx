"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BlindRankResult } from "@/lib/games/blind-rank";

type Props = {
  result: BlindRankResult;
  onFinished: () => void;
};

const ROW_REVEAL_MS = 550;

export default function RevealVerdict({ result, onFinished }: Props) {
  const total = result.slot_results.length;
  const [revealedRows, setRevealedRows] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let r = 1; r <= total; r++) {
      timers.push(setTimeout(() => setRevealedRows(r), r * ROW_REVEAL_MS));
    }
    // Roll up the score counter once all rows are out.
    const scoreStart = total * ROW_REVEAL_MS + 200;
    const finalScore = result.score;
    if (finalScore === 0) {
      timers.push(setTimeout(() => setScoreDisplay(0), scoreStart));
    } else {
      for (let s = 1; s <= finalScore; s++) {
        timers.push(setTimeout(() => setScoreDisplay(s), scoreStart + s * 280));
      }
    }
    // After the score lands, give a beat then signal parent.
    const endAt = scoreStart + finalScore * 280 + 1400;
    timers.push(setTimeout(onFinished, endAt));
    return () => timers.forEach(clearTimeout);
  }, [result.score, total, onFinished]);

  return (
    <section className="px-6 lg:px-10 pt-12 pb-12 max-w-[1100px] mx-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2 text-center">
        The verdict
      </div>
      <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.3rem,2.6vw,1.9rem)] leading-tight tracking-tight text-[var(--color-bone)] mb-8 text-center">
        {result.topic_title}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6 items-start">
        <Column
          label="Your ranking"
          rows={result.slot_results.map((sr) => ({
            slot: sr.slot,
            name: sr.player_name,
            tone: sr.correct ? "green" : "red",
            revealed: revealedRows >= sr.slot,
          }))}
          align="right"
        />

        <div className="hidden lg:flex flex-col items-center pt-12">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
            vs
          </span>
        </div>

        <Column
          label="The truth"
          rows={result.slot_results.map((sr) => ({
            slot: sr.slot,
            name: sr.ai_name,
            tone: "neutral",
            revealed: revealedRows >= sr.slot,
          }))}
          align="left"
        />
      </div>

      <div className="text-center mt-10">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2">
          Score
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(4rem,12vw,8rem)] leading-none tracking-tight">
          <span style={{ color: scoreColor(scoreDisplay) }}>{scoreDisplay}</span>
          <span className="text-[var(--color-mute)] text-[0.55em]">/{total}</span>
        </div>
      </div>
    </section>
  );
}

type RowTone = "green" | "red" | "neutral";

function Column({
  label,
  rows,
  align,
}: {
  label: string;
  rows: { slot: number; name: string; tone: RowTone; revealed: boolean }[];
  align: "left" | "right";
}) {
  return (
    <div>
      <div
        className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-3 ${
          align === "right" ? "text-right lg:text-right" : "text-left lg:text-left"
        }`}
      >
        {label}
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <motion.li
            key={r.slot}
            initial={false}
            animate={r.revealed ? { opacity: 1, x: 0 } : { opacity: 0, x: align === "right" ? 12 : -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`flex items-center gap-3 p-3 rounded border ${
              r.revealed ? toneStyles(r.tone) : "border-[var(--color-line)] bg-transparent"
            }`}
          >
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-[family-name:var(--font-fraunces)] font-black text-sm ${
                r.revealed && r.tone === "green"
                  ? "bg-[var(--color-games-green)] text-[var(--color-black)]"
                  : r.revealed && r.tone === "red"
                  ? "bg-[var(--color-red)] text-[var(--color-bone)]"
                  : "bg-[var(--color-line)] text-[var(--color-mute)]"
              }`}
            >
              {r.slot}
            </span>
            <span className="font-[family-name:var(--font-fraunces)] text-base leading-snug text-[var(--color-bone)] flex-1">
              {r.name}
            </span>
            {r.revealed && r.tone === "green" && (
              <span className="text-[var(--color-games-green)] text-lg leading-none">✓</span>
            )}
            {r.revealed && r.tone === "red" && (
              <span className="text-[var(--color-red)] text-lg leading-none">✗</span>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function toneStyles(tone: RowTone): string {
  if (tone === "green") {
    return "border-[var(--color-games-green)] bg-[rgba(62,207,178,0.10)]";
  }
  if (tone === "red") {
    return "border-[var(--color-red)] bg-[rgba(230,57,70,0.12)]";
  }
  return "border-[var(--color-line-strong)] bg-[var(--color-off-black)]";
}

function scoreColor(score: number): string {
  if (score === 5) return "var(--color-games-green)";
  if (score >= 3) return "var(--color-games-yellow)";
  if (score === 0) return "var(--color-red)";
  return "var(--color-bone)";
}
