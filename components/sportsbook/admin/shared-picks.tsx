"use client";

import { useState } from "react";
import type { SbItem, SbPick } from "@/lib/sportsbook/types";
import { CardHead, CardPrompt, ResultLine, TeamDot, isLocked, isWinningOption } from "../card-parts";
import { useSbAction } from "./use-action";

type Side = "jaiye" | "remi";
const SIDE_NAME: Record<Side, string> = { jaiye: "Jaiye", remi: "Remi" };

/**
 * The shared screen. Each card has a Jaiye side and a Remi side. A pick
 * stays covered until both have picked that card, so passing the phone is fair.
 */
export default function SharedPicks({
  items,
  picks,
  ids,
  now,
  week,
  submitted,
}: {
  items: SbItem[];
  picks: SbPick[];
  ids: Record<Side, string>;
  now: number;
  week: number;
  submitted: string[];
}) {
  const { run, busy, error } = useSbAction();
  const lockItem = (side: Side) => picks.find((p) => p.player_id === ids[side] && p.is_lock)?.item_id ?? null;

  const isSubmitted = (side: Side) => submitted.includes(ids[side]);
  const left = (side: Side) =>
    items.filter((i) => {
      if (Date.parse(i.locks_at) <= now) return false;
      const p = picks.find((x) => x.item_id === i.id && x.player_id === ids[side]);
      return !p || (p.choice === null && p.guess === null);
    }).length;

  const submitBar = (
    <div className="grid grid-cols-1 gap-3 @min-[600px]:grid-cols-2">
      {(["jaiye", "remi"] as Side[]).map((side) =>
        isSubmitted(side) ? (
          <div key={side} className="flex min-h-12 items-center justify-center border border-[var(--color-green)] px-3 text-center text-[0.9rem] text-[var(--color-green)]">
            {SIDE_NAME[side]}&apos;s picks are submitted, locked and public ✓
          </div>
        ) : (
          <button
            key={side}
            type="button"
            disabled={!!busy || left(side) > 0}
            onClick={() => {
              if (window.confirm(`Submit ${SIDE_NAME[side]}'s picks? They lock for the week and go on the public page.`)) {
                void run("submit", { week, player: side }, `submit:${side}`);
              }
            }}
            className={`min-h-12 border px-3 font-[family-name:var(--font-jetbrains)] text-[0.68rem] uppercase tracking-[0.15em] disabled:opacity-50 ${
              side === "jaiye" ? "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]" : "border-[var(--color-bone)] bg-[var(--color-bone)] text-[var(--color-black)]"
            }`}
          >
            {busy === `submit:${side}`
              ? "Submitting…"
              : left(side) > 0
                ? `${SIDE_NAME[side]}: ${left(side)} ${left(side) === 1 ? "card" : "cards"} left to pick`
                : `Submit ${SIDE_NAME[side]}'s picks`}
          </button>
        ),
      )}
    </div>
  );

  return (
    <div>
      {error ? <p className="mb-4 border border-[var(--color-red)] px-3 py-2 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      <div className="mb-5">{submitBar}</div>
      <div className="grid grid-cols-1 gap-4 @min-[900px]:grid-cols-2">
        {items.map((item) => (
          <SharedCard key={item.id} item={item} picks={picks} ids={ids} now={now} busy={busy} run={run} lockItem={lockItem} isSubmitted={isSubmitted} />
        ))}
      </div>
      <div className="mt-5">{submitBar}</div>
    </div>
  );
}

function SharedCard({
  item,
  picks,
  ids,
  now,
  busy,
  run,
  lockItem,
  isSubmitted,
}: {
  item: SbItem;
  picks: SbPick[];
  ids: Record<Side, string>;
  now: number;
  busy: string | null;
  run: ReturnType<typeof useSbAction>["run"];
  lockItem: (side: Side) => string | null;
  isSubmitted: (side: Side) => boolean;
}) {
  const locked = isLocked(item, now) || item.status !== "open";
  const mine = (side: Side) => picks.find((p) => p.item_id === item.id && p.player_id === ids[side]);
  const has = (p: SbPick | undefined) => !!p && (p.choice !== null || p.guess !== null);
  const bothIn = has(mine("jaiye")) && has(mine("remi"));
  const reveal = locked || bothIn;

  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/50 p-4">
      <CardHead item={item} now={now} />
      <CardPrompt item={item} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["jaiye", "remi"] as Side[]).map((side) => (
          <SideColumn
            key={side}
            side={side}
            item={item}
            pick={mine(side)}
            reveal={reveal || isSubmitted(side)}
            locked={locked || isSubmitted(side)}
            busy={busy}
            lockedElsewhere={lockItem(side) !== null && lockItem(side) !== item.id}
            onPick={(payload) => run("pick", { item_id: item.id, player: side, ...payload }, `${item.id}:${side}`)}
          />
        ))}
      </div>
      <ResultLine item={item} />
    </div>
  );
}

function SideColumn({
  side,
  item,
  pick,
  reveal,
  locked,
  busy,
  lockedElsewhere,
  onPick,
}: {
  side: Side;
  item: SbItem;
  pick: SbPick | undefined;
  reveal: boolean;
  locked: boolean;
  busy: string | null;
  lockedElsewhere: boolean;
  onPick: (p: Record<string, unknown>) => void;
}) {
  const [peek, setPeek] = useState(false);
  const picked = !!pick && (pick.choice !== null || pick.guess !== null);
  const covered = picked && !reveal && !peek;
  const saving = busy === `${item.id}:${side}`;
  const [guess, setGuess] = useState(pick?.guess !== null && pick?.guess !== undefined ? String(pick.guess) : "");
  const [talk, setTalk] = useState(pick?.talk ?? "");

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-[family-name:var(--font-fraunces)] text-[1rem] font-black ${side === "jaiye" ? "text-[var(--color-red)]" : ""}`}>
          {SIDE_NAME[side]}
        </span>
        {saving ? <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-[var(--color-warm-mute)]">Saving…</span> : null}
      </div>

      {covered ? (
        <button
          type="button"
          onClick={() => setPeek(true)}
          className="flex min-h-12 w-full items-center justify-center border border-dashed border-[var(--color-line-strong)] px-2 text-center text-[0.8rem] text-[var(--color-warm-mute)]"
        >
          Picked ✓ · tap to change
        </button>
      ) : item.type === "closest" ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          disabled={locked}
          value={guess}
          placeholder="Your guess"
          onChange={(e) => setGuess(e.target.value)}
          onBlur={() => {
            const n = guess.trim() === "" ? null : Number(guess);
            if (n !== (pick?.guess ?? null)) onPick({ guess: n });
          }}
          className="h-12 w-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-3 text-[1rem] disabled:opacity-60"
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {item.options.map((o) => {
            const chosen = pick?.choice === o.key;
            const won = isWinningOption(item, o.key);
            return (
              <button
                key={o.key}
                type="button"
                disabled={locked}
                aria-pressed={chosen}
                onClick={() => !chosen && onPick({ choice: o.key })}
                className={`flex min-h-11 items-center gap-2 border px-2 text-left text-[0.82rem] leading-tight transition-colors disabled:cursor-default ${
                  chosen
                    ? won || item.status !== "graded"
                      ? "border-[var(--color-red)] bg-[var(--color-red)]/15"
                      : "border-[var(--color-warm-mute)] bg-[var(--color-warm-surface-2)] line-through"
                    : "border-[var(--color-line-strong)] hover:border-[var(--color-warm-mute)]"
                } ${locked && !chosen ? "opacity-50" : ""}`}
              >
                <TeamDot option={o} />
                <span className="min-w-0 flex-1">{o.label}</span>
                {won ? <span className="text-[var(--color-green)]">✓</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {picked && !covered ? (
        <button
          type="button"
          disabled={locked || (lockedElsewhere && !pick?.is_lock)}
          onClick={() => onPick({ is_lock: !pick?.is_lock })}
          title={lockedElsewhere && !pick?.is_lock ? "Lock is on another pick" : undefined}
          className={`mt-2 w-full border px-2 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] disabled:opacity-40 ${
            pick?.is_lock ? "border-[var(--color-games-yellow)] text-[var(--color-games-yellow)]" : "border-[var(--color-line)] text-[var(--color-warm-mute)]"
          }`}
        >
          {pick?.is_lock ? "★ Lock of the Week" : lockedElsewhere ? "Lock used" : "☆ Make it my lock"}
        </button>
      ) : null}

      {picked && !covered && !locked ? (
        <input
          type="text"
          maxLength={80}
          value={talk}
          placeholder="Trash talk (optional)"
          onChange={(e) => setTalk(e.target.value)}
          onBlur={() => {
            if (talk.trim() !== (pick?.talk ?? "")) onPick({ talk: talk.trim() || null });
          }}
          className="mt-2 h-10 w-full border border-[var(--color-line)] bg-transparent px-2 text-[0.8rem] placeholder:text-[var(--color-warm-dim)]"
        />
      ) : pick?.talk && reveal ? (
        <p className="mt-2 text-[0.8rem] italic text-[var(--color-warm-mute)]">&ldquo;{pick.talk}&rdquo;</p>
      ) : null}
    </div>
  );
}
