import type { ReactNode } from "react";
import { TEAMS } from "@/lib/nba/teams";
import { ITEM_TYPE_LABEL, type ItemOption, type SbItem } from "@/lib/sportsbook/types";
import { tipLabel } from "@/lib/sportsbook/weeks";

export function isLocked(item: Pick<SbItem, "locks_at">, now = Date.now()) {
  return Date.parse(item.locks_at) <= now;
}

/** Top row of every card: type, points, lock time. */
export function CardHead({ item, now }: { item: SbItem; now: number }) {
  const locked = isLocked(item, now);
  return (
    <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.18em]">
      <span className={item.type === "upset" ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"}>
        {ITEM_TYPE_LABEL[item.type]}
      </span>
      <span className="text-[var(--color-mute)]">·</span>
      <span className="text-[var(--color-bone)]">
        {item.points} {item.points === 1 ? "pt" : "pts"}
      </span>
      <span className="ml-auto text-[var(--color-mute)]">
        {item.status === "graded" ? "Final" : item.status === "void" ? "Void" : locked ? "Locked" : `Locks ${tipLabel(item.locks_at)}`}
      </span>
    </div>
  );
}

export function CardPrompt({ item }: { item: SbItem }) {
  return (
    <>
      <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.25rem] font-black leading-tight tracking-[-0.02em]">
        {item.prompt}
      </h3>
      {item.note ? <p className="mt-1 text-[0.85rem] leading-snug text-[var(--color-mute)]">{item.note}</p> : null}
    </>
  );
}

/** A small team colored stripe so options read at a glance. */
export function TeamDot({ option }: { option: ItemOption }) {
  if (!option.team) return null;
  const t = TEAMS[option.team];
  return <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: t.primary, boxShadow: `inset 0 -3px 0 ${t.secondary}` }} />;
}

export function ResultLine({ item }: { item: SbItem }) {
  if (!item.result) return null;
  return (
    <div className="mt-3 border-t border-[var(--color-line)] pt-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] tracking-[0.05em] text-[var(--color-bone)]">
      {item.result.display}
    </div>
  );
}

export function isWinningOption(item: SbItem, key: string) {
  return item.status === "graded" && !!item.result?.winners.includes(key);
}

/** Initial badge for Jaiye (J), Remi (R) or a challenger. */
export function Who({ label, tone }: { label: string; tone: "jaiye" | "remi" | "you" }) {
  const bg = tone === "jaiye" ? "var(--color-red)" : tone === "remi" ? "var(--color-bone)" : "var(--color-games-yellow)";
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] font-medium text-[var(--color-black)]"
      style={{ background: bg }}
    >
      {label}
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4 ${className}`}>{children}</div>;
}

/** The little line under a tile: when it starts, how many are done, or Final. */
export function tileStatus(items: SbItem[], now: number): string {
  const open = items.filter((i) => !isLocked(i, now)).sort((a, b) => a.locks_at.localeCompare(b.locks_at));
  if (open.length) return `Starts ${tipLabel(open[0].locks_at)}`;
  const done = items.filter((i) => i.status !== "open").length;
  return done === items.length ? "Final" : done ? `${done} final` : "Playing";
}
