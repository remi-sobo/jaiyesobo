"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TopicPicker from "./topic-picker";
import ItemReveal from "./item-reveal";
import SlotSelector from "./slot-selector";
import LeaderboardPanel from "./leaderboard-panel";
import RevealVerdict from "./reveal-verdict";
import BlindRankResultView from "./blind-rank-result";
import {
  ROUND_COUNT,
  SLOT_COUNT,
  type BlindRankResult,
} from "@/lib/games/blind-rank";
import type { BlindRankTopicRow } from "@/lib/games/blind-rank-data";

type Phase = "pick" | "loading" | "ranking" | "finishing" | "revealing" | "result" | "error";

type StartResponse = {
  play_id: string;
  share_token: string;
  topic_title: string;
  topic_subtitle: string;
  items: { item_index: number; name: string }[];
};

const SELECTOR_DELAY_MS = 800;

type Props = {
  topics: Pick<BlindRankTopicRow, "id" | "payload">[];
};

export default function BlindRankGame({ topics }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<StartResponse | null>(null);
  const [round, setRound] = useState(0); // 0..ROUND_COUNT-1
  /** slot -> item name */
  const [placedBySlot, setPlacedBySlot] = useState<Record<number, string>>({});
  /** slot -> item_index, used for cross-checks; mirrors server placements */
  const placedIndicesBySlot = useRef<Record<number, number>>({});
  const [selectorReady, setSelectorReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BlindRankResult | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const selectorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After each new round starts, wait SELECTOR_DELAY_MS before showing slot UI.
  // The "look at the item first" beat is intentional — the synchronous
  // selectorReady=false reset is the whole point of this effect.
  useEffect(() => {
    if (phase !== "ranking") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectorReady(false);
    if (selectorTimer.current) clearTimeout(selectorTimer.current);
    selectorTimer.current = setTimeout(() => setSelectorReady(true), SELECTOR_DELAY_MS);
    return () => {
      if (selectorTimer.current) clearTimeout(selectorTimer.current);
    };
  }, [phase, round]);

  const beginGame = useCallback(async (topicId: string) => {
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/games/blind-rank/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = (await res.json()) as StartResponse & {
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.play_id) {
        setError(data.message ?? data.error ?? "Couldn't start a round.");
        setPhase("error");
        return;
      }
      setStart(data);
      setRound(0);
      setPlacedBySlot({});
      placedIndicesBySlot.current = {};
      setResult(null);
      setShareToken(data.share_token);
      setPhase("ranking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("error");
    }
  }, []);

  const finish = useCallback(async () => {
    if (!start) return;
    setPhase("finishing");
    try {
      const res = await fetch("/api/games/blind-rank/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ play_id: start.play_id }),
      });
      const data = (await res.json()) as BlindRankResult & {
        error?: string;
        share_token?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Couldn't score the round.");
        setPhase("error");
        return;
      }
      setResult(data);
      if (data.share_token) setShareToken(data.share_token);
      setPhase("revealing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setPhase("error");
    }
  }, [start]);

  const placeCurrent = useCallback(
    async (slot: number) => {
      if (!start || busy) return;
      const current = start.items[round];
      if (!current) return;
      setBusy(true);
      try {
        const res = await fetch("/api/games/blind-rank/place", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            play_id: start.play_id,
            item_index: current.item_index,
            slot,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Couldn't lock placement.");
          setBusy(false);
          return;
        }
        setPlacedBySlot((cur) => ({ ...cur, [slot]: current.name }));
        placedIndicesBySlot.current = {
          ...placedIndicesBySlot.current,
          [slot]: current.item_index,
        };
        const nextRound = round + 1;
        if (nextRound >= ROUND_COUNT) {
          // All 5 placed — finish.
          setBusy(false);
          await finish();
        } else {
          setRound(nextRound);
          setBusy(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
        setBusy(false);
      }
    },
    [start, round, busy, finish]
  );

  const playAgain = useCallback(() => {
    setStart(null);
    setRound(0);
    setPlacedBySlot({});
    placedIndicesBySlot.current = {};
    setSelectorReady(false);
    setResult(null);
    setShareToken(null);
    setError(null);
    setPhase("pick");
  }, []);

  if (phase === "error") {
    return (
      <section className="px-6 lg:px-10 py-24 max-w-[640px] mx-auto text-center">
        <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
          {error ?? "Something broke."}
        </h2>
        <button
          type="button"
          onClick={playAgain}
          className="mt-4 bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Try again
        </button>
      </section>
    );
  }

  if (phase === "pick") {
    return <TopicPicker topics={topics} onStart={beginGame} busy={false} />;
  }

  if (phase === "loading" || !start) {
    return (
      <section className="px-6 lg:px-10 py-32 max-w-[640px] mx-auto text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] animate-pulse">
          Shuffling the board…
        </div>
      </section>
    );
  }

  if (phase === "ranking") {
    const current = start.items[round];
    return (
      <div className="px-2 lg:px-6 max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <ItemReveal
            itemName={current?.name ?? ""}
            roundNumber={round + 1}
            totalRounds={ROUND_COUNT}
            selectorReady={selectorReady}
          />
          <SlotSelector
            currentItemName={current?.name ?? ""}
            placedBySlot={placedBySlot}
            visible={selectorReady}
            onLock={placeCurrent}
            busy={busy}
          />
        </div>
        <div className="px-4 lg:px-0 lg:pt-12">
          <LeaderboardPanel
            topicTitle={start.topic_title}
            topicSubtitle={start.topic_subtitle}
            roundNumber={round + 1}
            totalRounds={ROUND_COUNT}
            placedBySlot={placedBySlot}
          />
        </div>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <section className="px-6 lg:px-10 py-32 max-w-[640px] mx-auto text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] animate-pulse">
          Calling Mike Breen…
        </div>
      </section>
    );
  }

  if (phase === "revealing" && result) {
    return <RevealVerdict result={result} onFinished={() => setPhase("result")} />;
  }

  if (phase === "result" && result) {
    return (
      <BlindRankResultView
        result={result}
        shareToken={shareToken}
        onPlayAgain={playAgain}
      />
    );
  }

  // Suppress unused for SLOT_COUNT (kept exported for clarity)
  void SLOT_COUNT;
  return null;
}
