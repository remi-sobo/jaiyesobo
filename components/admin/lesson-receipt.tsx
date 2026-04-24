"use client";

import { useState } from "react";
import ReviewButton from "./review-button";
import type { LessonCompletion } from "@/lib/admin-data";

type Props = { item: LessonCompletion };

export default function LessonReceipt({ item }: Props) {
  const [open, setOpen] = useState(false);
  const r = item.responses as Record<string, unknown>;
  const names = typeof r.names === "string" ? r.names : "";
  const activity = (r.activity as { selected?: string; response?: string } | undefined) ?? {};
  const matching = (r.matching as Record<string, string> | undefined) ?? {};

  return (
    <article
      className={`bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden ${
        !item.reviewed_at ? "border-l-[3px] border-l-[var(--color-history)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-[var(--color-warm-surface-2)] transition-colors"
      >
        <div className="w-12 h-12 rounded bg-[var(--color-warm-surface-3)] text-[var(--color-history)] flex items-center justify-center text-2xl shrink-0">
          📚
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
            {item.subject ?? "History"} · Lesson · {new Date(item.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            {names && <> · {names}</>}
          </div>
          <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem] leading-snug">
            {item.task_title}
          </h3>
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          {open ? "Hide" : "Read"}
        </span>
      </button>

      {open && (
        <div className="p-6 border-t border-[var(--color-line)] flex flex-col gap-5">
          <ResponseBlock label="Q1 — First people on the land" value={r.q1} />

          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
              Q2 — Matching
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
              {["m1", "m2", "m3", "m4"].map((k, i) => (
                <div key={k} className="flex gap-2 items-start">
                  <dt className="text-[var(--color-warm-mute)] shrink-0 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase">
                    Blank {i + 1}
                  </dt>
                  <dd className="font-[family-name:var(--font-fraunces)] font-semibold text-[var(--color-bone)]">
                    {matching[k] || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ResponseBlock label="Q3 — Year EPA became a city" value={r.q3} />
          <ResponseBlock label="Q4 — Nairobi Movement (Jaiye stretch)" value={r.q4} />
          <ResponseBlock label="Q5 — What surprised you" value={r.q5} />

          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
              Activity — {activity.selected ?? "(none picked)"}
            </div>
            <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-relaxed whitespace-pre-wrap">
              {activity.response || "—"}
            </p>
          </div>

          <ResponseBlock label="Big reflection — what makes a community strong" value={r.reflection} big />

          <div className="flex justify-end pt-2">
            <ReviewButton completionId={item.completion_id} reviewed={!!item.reviewed_at} />
          </div>
        </div>
      )}
    </article>
  );
}

function ResponseBlock({ label, value, big }: { label: string; value: unknown; big?: boolean }) {
  const text = typeof value === "string" ? value : "";
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
        {label}
      </div>
      <p
        className={`font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-relaxed whitespace-pre-wrap ${
          big ? "text-[1.05rem]" : ""
        }`}
      >
        {text || "—"}
      </p>
    </div>
  );
}
