"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateGrid,
  type WordEntry,
  type WordPlacement,
  type WordSearchDifficulty,
} from "@/lib/games/word-search";
import WordSearchGrid from "./word-search-grid";
import WordList from "./word-list";
import WordSearchTimer from "./word-search-timer";
import FoundCelebration from "./found-celebration";
import WordSearchResult from "./word-search-result";

type Props = {
  themeSlug: string;
  packTitle: string;
  packSubtitle: string;
  difficulty: WordSearchDifficulty;
  gridSize: number;
  words: WordEntry[];
};

type FinishResponse = {
  time_ms: number;
  words_found_count: number;
  total_words: number;
  perfect: boolean;
  roast: string;
  share_token: string;
};

export default function WordSearchGame({
  themeSlug,
  packTitle,
  packSubtitle,
  difficulty,
  gridSize,
  words,
}: Props) {
  const [{ grid, placements }, setGenerated] = useState(() =>
    generateGrid(
      words.map((w) => w.word),
      gridSize
    )
  );
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [celebration, setCelebration] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [finishResult, setFinishResult] = useState<FinishResponse | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const playIdRef = useRef<string | null>(null);
  const elapsedMsRef = useRef(0);
  const finishingRef = useRef(false);
  const startedRef = useRef(false);

  const placedWordsSet = useMemo(() => new Set(placements.map((p) => p.word)), [placements]);
  const playableWords = useMemo(
    () => words.filter((w) => placedWordsSet.has(w.word)),
    [words, placedWordsSet]
  );

  // Kick off the play row on first mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/games/word-search/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ theme_slug: themeSlug }),
        });
        const data = (await res.json()) as { play_id?: string; share_token?: string };
        if (res.ok && data.play_id) {
          playIdRef.current = data.play_id;
          setShareToken(data.share_token ?? null);
        }
      } catch {
        /* keep playing locally if start failed */
      }
    })();
  }, [themeSlug]);

  const finish = useCallback(
    async (timeMs: number, foundList: string[]) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const totalPlayable = playableWords.length;
      if (!playIdRef.current) {
        const allFound = foundList.length === totalPlayable;
        setFinishResult({
          time_ms: timeMs,
          words_found_count: foundList.length,
          total_words: totalPlayable,
          perfect: allFound,
          roast: allFound ? "Locked in." : "Some words got away.",
          share_token: "",
        });
        finishingRef.current = false;
        return;
      }
      try {
        const res = await fetch("/api/games/word-search/finish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            play_id: playIdRef.current,
            time_ms: timeMs,
            words_found: foundList,
          }),
        });
        const data = (await res.json()) as FinishResponse;
        setFinishResult(data);
      } catch {
        setFinishResult({
          time_ms: timeMs,
          words_found_count: foundList.length,
          total_words: totalPlayable,
          perfect: foundList.length === totalPlayable,
          roast: "Saved locally.",
          share_token: "",
        });
      } finally {
        finishingRef.current = false;
      }
    },
    [playableWords.length]
  );

  const handleFound = useCallback(
    (p: WordPlacement) => {
      setFoundWords((prev) => {
        if (prev.has(p.word)) return prev;
        const next = new Set(prev);
        next.add(p.word);
        if (playableWords.length > 0 && next.size === playableWords.length) {
          setRunning(false);
          const elapsed = elapsedMsRef.current;
          queueMicrotask(() => finish(elapsed, Array.from(next)));
        }
        return next;
      });
      setCelebration(p.word);
      window.setTimeout(() => setCelebration((curr) => (curr === p.word ? null : curr)), 800);
    },
    [finish, playableWords.length]
  );

  const handleTick = useCallback((ms: number) => {
    elapsedMsRef.current = ms;
  }, []);

  function newGrid() {
    setGenerated(
      generateGrid(
        words.map((w) => w.word),
        gridSize
      )
    );
    setFoundWords(new Set());
    setRunning(true);
    setFinishResult(null);
    elapsedMsRef.current = 0;
  }

  if (finishResult) {
    return (
      <WordSearchResult
        title={packTitle}
        subtitle={packSubtitle}
        difficulty={difficulty}
        timeMs={finishResult.time_ms}
        perfect={finishResult.perfect}
        wordsFoundCount={finishResult.words_found_count}
        totalWords={finishResult.total_words}
        roast={finishResult.roast}
        shareToken={finishResult.share_token || shareToken}
      />
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 pt-8 pb-12">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
                Word Search · {difficulty}
              </div>
              <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.6rem,3.5vw,2.5rem)] leading-[1] tracking-[-0.02em] mt-1">
                {packTitle}
              </h1>
            </div>
            <WordSearchTimer running={running} onTick={handleTick} />
          </div>
          <WordSearchGrid
            grid={grid}
            placements={placements}
            foundWords={foundWords}
            onFound={handleFound}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={newGrid}
              className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)] transition-colors"
            >
              ↻ Re-shuffle grid
            </button>
          </div>
        </div>
        <div className="lg:w-[260px] lg:flex-shrink-0">
          <WordList words={playableWords} foundWords={foundWords} />
        </div>
      </div>
      <FoundCelebration word={celebration} />
    </div>
  );
}
