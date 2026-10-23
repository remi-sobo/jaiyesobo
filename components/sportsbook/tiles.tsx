"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORY_INFO, type Category } from "@/lib/sportsbook/types";

export const TILE_TONE: Record<Category, string> = {
  matchups: "var(--color-red)",
  battles: "var(--color-bone)",
  fantasy: "var(--color-games-yellow)",
  higher_lower: "var(--color-green)",
  yes_no: "var(--color-amber)",
  wild: "var(--color-red-bright)",
};

export type Tile = {
  category: Category;
  /** Picks in the tile. */
  count: number;
  /** How many of them this viewer has picked. Leave out on read only pages. */
  done?: number;
  /** One short status line, like "Starts Mon 4:00 PM" or "Final". */
  status?: string;
  content: ReactNode;
};

/**
 * The tile menu. Tap a tile and its picks pop up. Next and back walk through
 * the tiles without closing, so making 30 picks feels like flipping pages.
 */
export default function TileGrid({ tiles, footer }: { tiles: Tile[]; footer?: ReactNode }) {
  const [open, setOpen] = useState<Category | null>(null);
  const idx = tiles.findIndex((t) => t.category === open);
  const tile = idx >= 0 ? tiles[idx] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => {
          const info = CATEGORY_INFO[t.category];
          const tone = TILE_TONE[t.category];
          const complete = t.done !== undefined && t.done >= t.count;
          return (
            <button
              key={t.category}
              type="button"
              onClick={() => setOpen(t.category)}
              className="group relative flex min-h-[150px] flex-col overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4 text-left transition-colors hover:border-[var(--color-line-hover)]"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -bottom-6 font-[family-name:var(--font-fraunces)] text-[6.5rem] font-black leading-none opacity-[0.07]"
                style={{ color: tone }}
              >
                {t.count}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em]" style={{ color: tone }}>
                {info.points}
              </span>
              <span className="mt-1.5 font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,3.6vw,1.45rem)] font-black leading-[1.05] tracking-[-0.02em]">
                {info.title}
              </span>
              <span className="mt-1.5 line-clamp-3 text-[0.8rem] leading-snug text-[var(--color-mute)]">{info.blurb}</span>
              <span className="mt-auto flex items-center gap-2 pt-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.12em]">
                {t.done !== undefined ? (
                  <span className={complete ? "text-[var(--color-green)]" : "text-[var(--color-bone)]"}>
                    {complete ? "✓ " : ""}
                    {t.done}/{t.count} picked
                  </span>
                ) : (
                  <span className="text-[var(--color-bone)]">{t.count} picks</span>
                )}
                {t.status ? <span className="truncate text-[var(--color-mute)]">· {t.status}</span> : null}
                <span aria-hidden className="ml-auto text-[var(--color-mute)] transition-transform group-hover:translate-x-0.5">
                  ›
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {tile ? (
        <TileDialog
          tile={tile}
          prev={idx > 0 ? tiles[idx - 1] : null}
          next={idx < tiles.length - 1 ? tiles[idx + 1] : null}
          go={setOpen}
          onClose={() => setOpen(null)}
          footer={footer}
        />
      ) : null}
    </>
  );
}

function TileDialog({
  tile,
  prev,
  next,
  go,
  onClose,
  footer,
}: {
  tile: Tile;
  prev: Tile | null;
  next: Tile | null;
  go: (c: Category) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const info = CATEGORY_INFO[tile.category];
  const tone = TILE_TONE[tile.category];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // New tile, back to the top.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tile.category]);

  const nav = "flex min-h-12 min-w-0 items-center gap-2 border border-[var(--color-line-strong)] px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] hover:border-[var(--color-line-hover)]";

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tile-title"
        onClick={(e) => e.stopPropagation()}
        className="@container flex max-h-[92vh] w-full max-w-[880px] flex-col border border-[var(--color-line-strong)] bg-[var(--color-black)]"
      >
        <div className="relative flex items-start justify-between gap-4 border-b border-[var(--color-line)] p-4 sm:p-5">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: tone }}>
              {info.points}
              {tile.done !== undefined ? ` · ${tile.done}/${tile.count} picked` : ` · ${tile.count} picks`}
            </div>
            <h2 id="tile-title" className="mt-1 font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,5vw,2.2rem)] font-black leading-tight tracking-[-0.02em]">
              {info.title}
            </h2>
            <p className="mt-1 text-[0.85rem] text-[var(--color-mute)]">{info.blurb}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)]"
          >
            ✕
          </button>
        </div>
        <div ref={bodyRef} className="overflow-y-auto p-4 sm:p-5">
          {tile.content}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-line)] p-3">
          {prev ? (
            <button type="button" onClick={() => go(prev.category)} className={nav}>
              <span aria-hidden>‹</span>
              <span className="truncate">{CATEGORY_INFO[prev.category].title}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button type="button" onClick={() => go(next.category)} className={`${nav} justify-end text-right`} style={{ borderColor: TILE_TONE[next.category] }}>
              <span className="truncate">Next: {CATEGORY_INFO[next.category].title}</span>
              <span aria-hidden>›</span>
            </button>
          ) : (
            <button type="button" onClick={onClose} className={`${nav} justify-end`}>
              Done
            </button>
          )}
        </div>
        {footer && !next ? <div className="border-t border-[var(--color-line)] p-3">{footer}</div> : null}
      </div>
    </div>
  );
}
