"use client";

import { useState } from "react";
import Link from "next/link";
import ShareModal from "@/components/games/share-modal";
import { formatTime } from "@/lib/games/word-search-roasts";
import type { WordSearchDifficulty } from "@/lib/games/word-search";

type Props = {
  title: string;
  subtitle: string;
  difficulty: WordSearchDifficulty;
  timeMs: number;
  perfect: boolean;
  wordsFoundCount: number;
  totalWords: number;
  roast: string;
  shareToken: string | null;
};

export default function WordSearchResult({
  title,
  subtitle,
  difficulty,
  timeMs,
  perfect,
  wordsFoundCount,
  totalWords,
  roast,
  shareToken,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/games/share/${shareToken}`
      : "";

  const headline = perfect ? "Solved." : "Time's up.";

  return (
    <div className="max-w-[640px] mx-auto px-6 pt-12 pb-6">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-3">
        Word Search · {difficulty}
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,9vw,6rem)] leading-[0.9] tracking-[-0.04em] mb-4">
        {perfect ? (
          <>
            <span className="italic font-normal text-[var(--color-red)]">{headline}</span>
          </>
        ) : (
          headline
        )}
      </h1>

      <div className="flex items-baseline gap-6 mb-6">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-1">
            Time
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] tabular-nums text-[clamp(2.25rem,6vw,4rem)] leading-none">
            {formatTime(timeMs)}
          </div>
        </div>
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-1">
            Words
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] tabular-nums text-[clamp(2.25rem,6vw,4rem)] leading-none">
            {wordsFoundCount}
            <span className="text-[var(--color-mute)] text-[0.5em]">/{totalWords}</span>
          </div>
        </div>
      </div>

      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.7vw,1.4rem)] text-[var(--color-bone)] leading-snug mb-8">
        “{roast}”
      </p>

      <div className="border-t border-[var(--color-line)] pt-5 mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-1.5">
          Pack
        </div>
        <div className="font-[family-name:var(--font-fraunces)] text-xl tracking-tight">{title}</div>
        {subtitle && <div className="text-[var(--color-mute)] text-sm mt-1">{subtitle}</div>}
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mt-3">
          Curated by Jaiye Sobo, age 8
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {shareToken && (
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            Share
          </button>
        )}
        <Link
          href="/games/word-search"
          className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          Try another pack →
        </Link>
      </div>

      {shareToken && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={shareUrl}
          title={`${perfect ? "Solved" : `${wordsFoundCount}/${totalWords}`}: ${title} · Word Search`}
          subtext={`${formatTime(timeMs)} · ${roast}`}
        />
      )}
    </div>
  );
}
