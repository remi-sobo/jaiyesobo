"use client";

import { useEffect, useState } from "react";
import type { CutPlayResult, CutSetItem } from "@/lib/games/the-cut";

type Props = {
  /** Items in the order the player saw on the board. */
  boardOrder: string[];
  result: CutPlayResult;
  /** Player's selected keep names. */
  keptNames: string[];
  /** When the reveal animation finishes, parent can move to TheCutResult. */
  onFinished: () => void;
  /** Whether to show the criterion at the top — true for hard mode (it was hidden during play). */
  showCriterionTop: boolean;
};

type ItemStatus = "correct_keep" | "wrong_keep" | "missed_keep" | "correct_cut";

const STEP_MS = 600;
const TOTAL_STEPS = 5; // 0=flip, 1=greens, 2=reds, 3=yellows, 4=score

export default function VerdictReveal({
  boardOrder,
  result,
  keptNames,
  onFinished,
  showCriterionTop,
}: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      timers.push(setTimeout(() => setStep(s), s * STEP_MS));
    }
    // After last step, give a beat then signal parent (parent decides whether
    // to swap to TheCutResult view).
    timers.push(setTimeout(onFinished, TOTAL_STEPS * STEP_MS + 1400));
    return () => timers.forEach(clearTimeout);
  }, [onFinished]);

  const factByName = new Map(result.all_items_with_facts.map((i) => [i.name, i]));
  const keptSet = new Set(keptNames);

  function statusFor(name: string): ItemStatus {
    const item = factByName.get(name) as CutSetItem | undefined;
    const wasKeep = !!item?.is_keep;
    const wasKept = keptSet.has(name);
    if (wasKept && wasKeep) return "correct_keep";
    if (wasKept && !wasKeep) return "wrong_keep";
    if (!wasKept && wasKeep) return "missed_keep";
    return "correct_cut";
  }

  function visibleFor(status: ItemStatus): boolean {
    if (step >= 1 && status === "correct_keep") return true;
    if (step >= 2 && status === "wrong_keep") return true;
    if (step >= 3 && status === "missed_keep") return true;
    if (step >= 4 && status === "correct_cut") return true;
    return step === 0;
  }

  return (
    <section className="px-6 lg:px-10 pt-12 pb-12 max-w-[1100px] mx-auto">
      {showCriterionTop && (
        <div className="text-center mb-8">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-3">
            The criterion was
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.4rem,3vw,2.4rem)] leading-snug text-[var(--color-bone)] max-w-[56ch] mx-auto">
            {result.criterion_summary}
          </h2>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {boardOrder.map((name) => {
          const status = statusFor(name);
          const item = factByName.get(name);
          const revealed = visibleFor(status);
          return (
            <CardReveal
              key={name}
              name={name}
              fact={item?.fact ?? ""}
              status={status}
              revealed={revealed}
            />
          );
        })}
      </div>

      {step >= TOTAL_STEPS - 1 && (
        <div className="text-center">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2">
            Final
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(4rem,12vw,8rem)] leading-none tracking-tight">
            <span style={{ color: scoreColor(result.score) }}>{result.score}</span>
            <span className="text-[var(--color-mute)] text-[0.55em]">/{result.total_keeps}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function CardReveal({
  name,
  fact,
  status,
  revealed,
}: {
  name: string;
  fact: string;
  status: ItemStatus;
  revealed: boolean;
}) {
  const tone = TONES[status];
  return (
    <div
      className={`rounded p-4 transition-all duration-500 ${
        revealed ? "opacity-100" : "opacity-30"
      } ${tone.shake ? "animate-pulse" : ""}`}
      style={{
        background: revealed ? tone.bg : "var(--color-card)",
        border: `2px solid ${revealed ? tone.border : "var(--color-line)"}`,
        transform: revealed ? "scale(1)" : "scale(0.96)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em]"
          style={{ color: revealed ? tone.label : "var(--color-mute)" }}
        >
          {tone.tag}
        </span>
        <span className="text-lg leading-none" style={{ color: revealed ? tone.label : "var(--color-mute)" }}>
          {tone.icon}
        </span>
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1rem,2vw,1.25rem)] leading-tight tracking-tight text-[var(--color-bone)] mb-2">
        {name}
      </h3>
      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] leading-relaxed text-[var(--color-mute)] min-h-[2.5em]">
        {revealed ? fact : ""}
      </p>
    </div>
  );
}

const TONES: Record<
  ItemStatus,
  { bg: string; border: string; label: string; tag: string; icon: string; shake?: boolean }
> = {
  correct_keep: {
    bg: "rgba(62,207,178,0.10)",
    border: "var(--color-games-green)",
    label: "var(--color-games-green)",
    tag: "Kept · correct",
    icon: "✓",
  },
  wrong_keep: {
    bg: "rgba(230,57,70,0.12)",
    border: "var(--color-red)",
    label: "var(--color-red)",
    tag: "Kept · wrong",
    icon: "✗",
  },
  missed_keep: {
    bg: "rgba(245,200,66,0.12)",
    border: "var(--color-games-yellow)",
    label: "var(--color-games-yellow)",
    tag: "Missed it",
    icon: "!",
    shake: true,
  },
  correct_cut: {
    bg: "transparent",
    border: "var(--color-line-strong)",
    label: "var(--color-mute)",
    tag: "Cut · correct",
    icon: "·",
  },
};

function scoreColor(score: number): string {
  if (score === 4) return "var(--color-games-green)";
  if (score >= 2) return "var(--color-games-yellow)";
  return "var(--color-red)";
}
