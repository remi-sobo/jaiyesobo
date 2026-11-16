"use client";

import { useEffect, useRef, useState } from "react";
import type { DayRow } from "@/lib/analytics/summarize";

/**
 * Visitors and page views per day, on one shared axis. Hover or use the arrow
 * keys to read a day. The same numbers are in the table underneath.
 * Colors were checked with the dataviz palette validator against the admin
 * surface (#1a1714).
 */

const SERIES = [
  { key: "pageviews", label: "Page views", color: "#4f8fe0" },
  { key: "visitors", label: "Visitors", color: "#E63946" },
] as const;

const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function niceMax(n: number) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 4, 5, 10]) if (n <= m * pow) return m * pow;
  return 10 * pow;
}

const shortDay = (key: string) => {
  const [, m, d] = key.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
};

export default function TrendChart({ days }: { days: DayRow[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = niceMax(Math.max(...days.map((d) => Math.max(d.pageviews, d.visitors)), 0));
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length === 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(innerW / 72))));

  function nearest(clientX: number) {
    const left = box.current?.getBoundingClientRect().left ?? 0;
    const ratio = (clientX - left - PAD.left) / innerW;
    return Math.min(days.length - 1, Math.max(0, Math.round(ratio * (days.length - 1))));
  }

  const tipLeft = at === null ? 0 : Math.min(width - 168, Math.max(0, x(at) + (x(at) > width / 2 ? -172 : 12)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-[var(--color-warm-bone)]">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-[2px] w-4" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div
        ref={box}
        className="relative"
        tabIndex={0}
        role="img"
        aria-label={`Daily visitors and page views for ${days.length} days. Use the left and right arrow keys to read each day.`}
        onPointerMove={(e) => setAt(nearest(e.clientX))}
        onPointerLeave={() => setAt(null)}
        onBlur={() => setAt(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setAt((v) => Math.min(days.length - 1, (v ?? -1) + 1));
          else if (e.key === "ArrowLeft") setAt((v) => Math.max(0, (v ?? days.length) - 1));
          else if (e.key === "Escape") setAt(null);
        }}
      >
        <svg width={width} height={H} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-warm-surface-3)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-warm-mute)" fontFamily="var(--font-jetbrains)">
                {Number.isInteger(t) ? t.toLocaleString() : ""}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.day} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--color-warm-mute)" fontFamily="var(--font-jetbrains)">
                {shortDay(d.day)}
              </text>
            ) : null,
          )}

          {at !== null && <line x1={x(at)} x2={x(at)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-warm-dim)" strokeWidth={1} />}

          {SERIES.map((s) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
              />
              {(days.length <= 14 || at !== null) &&
                days.map((d, i) =>
                  days.length <= 14 || i === at ? (
                    <circle key={d.day} cx={x(i)} cy={y(d[s.key])} r={i === at ? 5 : 4} fill={s.color} stroke="var(--color-warm-surface)" strokeWidth={2} />
                  ) : null,
                )}
            </g>
          ))}
        </svg>

        {at !== null && (
          <div
            className="pointer-events-none absolute top-2 w-40 border border-[var(--color-line-strong)] bg-[var(--color-warm-bg)] px-3 py-2 shadow-lg"
            style={{ left: tipLeft }}
          >
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">{shortDay(days[at].day)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="mt-1 flex items-center gap-2 text-[0.8rem]">
                <span aria-hidden className="inline-block h-[2px] w-3" style={{ background: s.color }} />
                <strong className="font-semibold text-[var(--color-bone)]">{days[at][s.key].toLocaleString()}</strong>
                <span className="text-[var(--color-warm-mute)]">{s.label.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]">
          Show as a table
        </summary>
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-left text-[0.85rem]">
            <thead className="text-[var(--color-warm-mute)]">
              <tr>
                <th className="py-1 pr-4 font-normal">Day</th>
                <th className="py-1 pr-4 text-right font-normal">Visitors</th>
                <th className="py-1 text-right font-normal">Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t border-[var(--color-line)]">
                  <td className="py-1 pr-4">{shortDay(d.day)}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{d.visitors.toLocaleString()}</td>
                  <td className="py-1 text-right tabular-nums">{d.pageviews.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
