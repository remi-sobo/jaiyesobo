"use client";

import { useMemo, useState } from "react";
import type { BlindRankTopicRow } from "@/lib/games/blind-rank-data";

type Props = {
  topics: Pick<BlindRankTopicRow, "id" | "payload">[];
  onStart: (topicId: string) => void;
  busy?: boolean;
};

export default function TopicPicker({ topics, onStart, busy = false }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof topics>();
    for (const t of topics) {
      const cat = t.payload.category || "general";
      const list = map.get(cat) ?? [];
      list.push(t);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [topics]);

  return (
    <section className="px-6 lg:px-10 pt-20 pb-24 max-w-[1100px] mx-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
        jaiyesobo.com / games / blind rank
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.9] tracking-[-0.04em] mb-6">
        Blind <span className="italic font-normal text-[var(--color-red)]">Rank.</span>
      </h1>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.35rem)] text-[var(--color-bone)] max-w-[48ch] leading-snug mb-12">
        Five items, revealed one at a time. Commit each to a slot. No take-backs.
      </p>

      {topics.length === 0 ? (
        <div className="border border-dashed border-[var(--color-line-strong)] rounded p-10 text-center">
          <div className="font-[family-name:var(--font-fraunces)] text-xl mb-2">
            No topics ready yet.
          </div>
          <p className="text-[var(--color-mute)] text-sm">
            Jaiye is curating. Check back soon.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 mb-10">
          {byCategory.map(([cat, list]) => (
            <section key={cat}>
              <h2 className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-4">
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((t) => {
                  const isSelected = selectedId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`text-left bg-[var(--color-card)] rounded p-5 transition-all border ${
                        isSelected
                          ? "border-[var(--color-red)] -translate-y-0.5"
                          : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:-translate-y-0.5"
                      }`}
                      style={
                        isSelected
                          ? { borderLeft: "3px solid var(--color-red)" }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em]"
                            style={{
                              color: isSelected ? "var(--color-red)" : "var(--color-mute)",
                            }}
                          >
                            {t.payload.difficulty}
                          </span>
                          {(t.payload.kind ?? "factual") === "opinion" && (
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)] border border-[var(--color-games-yellow)] rounded-sm px-1.5 py-0.5">
                              Opinion
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.3rem] leading-tight tracking-tight mb-1.5">
                        {t.payload.title}
                      </h3>
                      {t.payload.subtitle && (
                        <p className="text-[var(--color-mute)] text-sm leading-snug">
                          {t.payload.subtitle}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => selectedId && onStart(selectedId)}
        disabled={!selectedId || busy}
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Loading…" : "Start ranking →"}
      </button>
    </section>
  );
}
