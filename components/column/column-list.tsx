"use client";

import Link from "next/link";
import { useState } from "react";
import { Accent } from "@/components/site/type";

export type ColumnRow = {
  slug: string;
  number: string;
  title: string;
  titleAccent?: string;
  summary: string;
  topic: string;
  date: string;
  readMinutes: number;
  isDraft: boolean;
};

/** Every column, newest first, with topic buttons to narrow it down. */
export default function ColumnList({ rows }: { rows: ColumnRow[] }) {
  const topics = [...new Set(rows.map((r) => r.topic))];
  const [topic, setTopic] = useState<string | null>(null);
  const shown = topic ? rows.filter((r) => r.topic === topic) : rows;

  const chip = (on: boolean) =>
    `border px-3.5 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] transition-colors ${
      on
        ? "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]"
        : "border-[var(--color-line-strong)] text-[var(--color-mute)] hover:border-[var(--color-line-hover)] hover:text-[var(--color-bone)]"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter columns by topic">
        <button type="button" aria-pressed={topic === null} onClick={() => setTopic(null)} className={chip(topic === null)}>
          All · {rows.length}
        </button>
        {topics.map((t) => (
          <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)} className={chip(topic === t)}>
            {t}
          </button>
        ))}
      </div>

      <ol className="mt-8 list-none">
        {shown.map((r) => {
          const inner = (
            <div
              className={`group grid gap-x-8 gap-y-3 border-t border-[var(--color-line-strong)] py-7 sm:grid-cols-[minmax(0,88px)_minmax(0,1fr)_auto] sm:items-start ${
                r.isDraft ? "opacity-60" : ""
              }`}
            >
              <span className="font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4vw,3rem)] font-black leading-[0.9] tracking-[-0.04em] text-[var(--color-line-hover)] transition-colors group-hover:text-[var(--color-red)]">
                {r.number}
              </span>
              <div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em]">
                  <span className="text-[var(--color-red)]">{r.isDraft ? "Draft" : r.topic}</span>
                  <span className="text-[var(--color-mute)]">
                    {" "}
                    · {r.isDraft ? "Not out yet" : `${r.date} · ${r.readMinutes} min read`}
                  </span>
                </div>
                <h3 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,3.2vw,2.3rem)] font-black leading-[1] tracking-[-0.025em] text-pretty">
                  <Accent text={r.title} accent={r.titleAccent} />
                </h3>
                <p className="mt-3 max-w-[60ch] text-[1rem] leading-[1.65] text-[var(--color-mute)]">{r.summary}</p>
              </div>
              {!r.isDraft && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-red)] sm:pt-1">
                  Read ↗
                </span>
              )}
            </div>
          );
          return (
            <li key={r.slug}>
              {r.isDraft ? inner : (
                <Link href={`/column/${r.slug}`} className="block">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
