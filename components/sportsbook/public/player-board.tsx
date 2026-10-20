"use client";

import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/sportsbook/data";
import { pickPoints } from "@/lib/sportsbook/grade";
import { ITEM_TYPE_LABEL, type SbItem, type SbPick } from "@/lib/sportsbook/types";
import { tipLabel } from "@/lib/sportsbook/weeks";
import { TeamDot } from "../card-parts";

/**
 * The weekly leaderboard. Tap any name to see every pick that player made
 * this week, with results and points as games finish.
 */
export default function PlayerBoard({
  board,
  items,
  picks,
  now,
  limit = 12,
}: {
  board: Board[];
  items: SbItem[];
  picks: SbPick[];
  now: number;
  limit?: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (board.length === 0) return <p className="text-[0.9rem] text-[var(--color-mute)]">No picks yet.</p>;

  const jaiye = board.find((b) => b.player.kind === "jaiye")?.score.points;
  const challengers = board.filter((b) => b.player.kind === "challenger");
  const beatJaiye = jaiye === undefined ? 0 : challengers.filter((b) => b.score.points > jaiye).length;
  const rows = showAll ? board : board.slice(0, limit);
  const open = board.find((b) => b.player.id === openId) ?? null;

  return (
    <div>
      {challengers.length ? (
        <p className="mb-3 text-[0.9rem] text-[var(--color-mute)]">
          {beatJaiye === 0 ? "Nobody is beating me yet." : `${beatJaiye} of ${challengers.length} ${challengers.length === 1 ? "person is" : "people are"} beating me right now.`} Tap a name to see their picks.
        </p>
      ) : null}
      <ol>
        {rows.map((b, i) => (
          <li key={b.player.id} className="border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={() => setOpenId(b.player.id)}
              className="flex min-h-12 w-full items-center gap-3 py-2 text-left transition-colors hover:bg-[var(--color-off-black)]"
            >
              <span className="w-5 text-right font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">{i + 1}</span>
              <span className={`min-w-0 flex-1 truncate font-medium ${b.player.kind === "jaiye" ? "text-[var(--color-red)]" : ""}`}>
                {b.player.display_name}
                {b.player.kind !== "challenger" ? (
                  <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">Sobo</span>
                ) : null}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">
                {b.score.correct}-{b.score.wrong}
              </span>
              <span className="w-10 text-right font-[family-name:var(--font-jetbrains)]">{b.score.points}</span>
              <span aria-hidden className="text-[var(--color-mute)]">›</span>
            </button>
          </li>
        ))}
      </ol>
      {board.length > limit && !showAll ? (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-[0.85rem] text-[var(--color-mute)] underline-offset-4 hover:underline">
          Show all {board.length} players
        </button>
      ) : null}

      {open ? (
        <PicksDialog
          row={open}
          rank={board.findIndex((b) => b.player.id === open.player.id) + 1}
          items={items}
          picks={picks}
          now={now}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function PicksDialog({
  row,
  rank,
  items,
  picks,
  now,
  onClose,
}: {
  row: Board;
  rank: number;
  items: SbItem[];
  picks: SbPick[];
  now: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const p = row.player;
  const mine = picks.filter((k) => k.player_id === p.id);
  const house = p.kind !== "challenger";

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picks-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col border border-[var(--color-line-strong)] bg-[var(--color-off-black)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] p-5">
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
              #{rank} this week{house ? " · Sobo" : ""}
            </div>
            <h2
              id="picks-title"
              className={`mt-1 truncate font-[family-name:var(--font-fraunces)] text-[1.8rem] font-black leading-tight tracking-[-0.02em] ${
                p.kind === "jaiye" ? "text-[var(--color-red)]" : ""
              }`}
            >
              {p.display_name}
            </h2>
            <div className="mt-1 font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-bone)]">
              {row.score.points} pts · {row.score.correct} right · {row.score.wrong} wrong
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)]"
          >
            ✕
          </button>
        </div>

        <ol className="overflow-y-auto p-5">
          {mine.length === 0 ? (
            <li className="text-[0.9rem] text-[var(--color-mute)]">
              {house ? `${p.display_name}'s picks show up once they submit.` : "No picks yet."}
            </li>
          ) : (
            items.map((item) => {
              const pick = mine.find((k) => k.item_id === item.id);
              const answer =
                item.type === "closest"
                  ? pick?.guess !== null && pick?.guess !== undefined
                    ? `Guessed ${pick.guess}`
                    : null
                  : item.options.find((o) => o.key === pick?.choice) ?? null;
              const pts = pick ? pickPoints(item, pick, picks) : null;
              const status =
                item.status === "void" ? "void" : pts === null ? "pending" : pts > 0 ? "right" : "wrong";
              return (
                <li key={item.id} className="border-t border-[var(--color-line)] py-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
                    <span className={item.type === "upset" ? "text-[var(--color-red)]" : ""}>{ITEM_TYPE_LABEL[item.type]}</span>
                    <span>·</span>
                    <span>{item.points} {item.points === 1 ? "pt" : "pts"}</span>
                    <span className="ml-auto">{Date.parse(item.locks_at) > now ? `Locks ${tipLabel(item.locks_at)}` : item.status === "open" ? "In play" : "Final"}</span>
                  </div>
                  <div className="mt-1 text-[0.92rem] leading-snug text-[var(--color-bone)]">{item.prompt}</div>
                  <div className="mt-2 flex items-center gap-2 text-[0.9rem]">
                    {!pick || !answer ? (
                      <span className="text-[var(--color-mute)]">No pick</span>
                    ) : typeof answer === "string" ? (
                      <span className="font-medium">{answer}</span>
                    ) : (
                      <>
                        <TeamDot option={answer} />
                        <span className="font-medium">{answer.label}</span>
                      </>
                    )}
                    {pick?.is_lock ? (
                      <span className="text-[var(--color-games-yellow)]" title="Lock of the Week">
                        ★
                      </span>
                    ) : null}
                    <span className="ml-auto flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.75rem]">
                      {status === "right" ? (
                        <span className="text-[var(--color-green)]">✓ +{pts}</span>
                      ) : status === "wrong" ? (
                        <span className="text-[var(--color-red)]">✗ {pts && pts < 0 ? pts : 0}</span>
                      ) : status === "void" ? (
                        <span className="text-[var(--color-mute)]">void</span>
                      ) : (
                        <span className="text-[var(--color-mute)]">pending</span>
                      )}
                    </span>
                  </div>
                  {pick?.talk ? <p className="mt-1 text-[0.8rem] italic text-[var(--color-mute)]">&ldquo;{pick.talk}&rdquo;</p> : null}
                </li>
              );
            })
          )}
        </ol>
      </div>
    </div>
  );
}
