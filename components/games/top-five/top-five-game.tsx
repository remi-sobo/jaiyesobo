"use client";

import { useState } from "react";
import LoadingState from "@/components/games/loading-state";
import ShareModal from "@/components/games/share-modal";
import TopFiveResult from "./top-five-result";
import type { TopFiveVerdict } from "@/lib/games/top-five-types";

type Props = {
  promptId: string | null;
  promptText: string;
};

type Phase = "input" | "submitting" | "judging" | "result" | "error";

export default function TopFiveGame({ promptId, promptText }: Props) {
  const [picks, setPicks] = useState<string[]>(["", "", "", "", ""]);
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<TopFiveVerdict | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const allFilled = picks.every((p) => p.trim().length > 0);

  function setPick(i: number, value: string) {
    setPicks((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }

  async function submit() {
    if (!allFilled || phase === "submitting" || phase === "judging") return;
    setPhase("submitting");
    setErrorMessage(null);
    try {
      const cleaned = picks.map((p) => p.trim());
      const playRes = await fetch("/api/games/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: "top-five",
          payload: {
            prompt_id: promptId,
            prompt_text: promptText,
            picks: cleaned,
          },
        }),
      });
      const playPayload = await playRes.json().catch(() => ({}));
      if (!playRes.ok || !playPayload?.play_id) {
        throw new Error(playPayload?.error ?? "play_failed");
      }

      setShareToken(playPayload.share_token ?? null);
      setPhase("judging");

      const judgeRes = await fetch("/api/games/top-five/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ play_id: playPayload.play_id }),
      });
      const judgePayload = await judgeRes.json().catch(() => ({}));
      if (!judgeRes.ok || !judgePayload?.verdict) {
        throw new Error(judgePayload?.error ?? "judge_failed");
      }
      setVerdict(judgePayload.verdict as TopFiveVerdict);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setPhase("error");
      setErrorMessage("AI couldn't judge that one. Try again.");
    }
  }

  if (phase === "submitting" || phase === "judging") {
    return <LoadingState />;
  }

  if (phase === "result" && verdict) {
    const url = shareToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/share/${shareToken}`
      : "";
    return (
      <>
        <TopFiveResult prompt={promptText} picks={picks.map((p) => p.trim())} verdict={verdict} />
        <div className="max-w-[760px] mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!shareToken}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 transition-colors"
          >
            Share your list →
          </button>
          <a
            href="/games/top-five"
            className="bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center"
          >
            Play another
          </a>
        </div>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={url}
          title={`I rated ${verdict.rating}/10 on Jaiye's Top 5`}
          subtext={`"${verdict.take}"`}
        />
      </>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-6 py-24 lg:py-32">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-8">
        Today&apos;s Top 5
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] tracking-[-0.03em] mb-8">
        {promptText}
      </h1>
      <p className="text-[var(--color-mute)] text-[1.05rem] mb-20 max-w-[44ch] leading-relaxed">
        Pick your five. AI will rate your list and tell you what&apos;s based, what&apos;s a reach, and what&apos;s a stretch.
      </p>

      <ol className="flex flex-col gap-6 list-none mb-16">
        {picks.map((value, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr] gap-5 items-center">
            <span className="font-[family-name:var(--font-fraunces)] font-black text-3xl text-[var(--color-mute)] leading-none w-8 text-center">
              {i + 1}
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => setPick(i, e.target.value)}
              placeholder="Player name"
              maxLength={60}
              className="bg-[var(--color-card)] border border-[var(--color-line)] rounded px-4 py-4 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] text-[1.1rem] focus:outline-none focus:border-[var(--color-games-yellow)]"
            />
          </li>
        ))}
      </ol>

      {errorMessage && (
        <p className="mb-7 text-sm italic font-[family-name:var(--font-fraunces)] text-[var(--color-red-bright)]">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!allFilled}
        className="w-full sm:w-auto bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Get your verdict →
      </button>
    </div>
  );
}
