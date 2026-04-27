"use client";

import { useState } from "react";
import ReviewButton from "./review-button";
import type { LessonCompletion } from "@/lib/admin-data";

type Props = { item: LessonCompletion };

export default function LessonReceipt({ item }: Props) {
  const [open, setOpen] = useState(false);
  const r = item.responses as Record<string, unknown>;
  const isSports = item.lesson_slug === "sports-journalist-lab";
  const names = isSports
    ? `${asString(r["pick.team_a"])} vs ${asString(r["pick.team_b"])}`.trim()
    : typeof r.names === "string"
    ? r.names
    : "";

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
        <div className="w-12 h-12 rounded bg-[var(--color-warm-surface-3)] flex items-center justify-center text-2xl shrink-0">
          {isSports ? "🎙️" : "📚"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
            {item.subject ?? "Lesson"} ·{" "}
            {new Date(item.completed_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {names && names.trim().length > 0 && <> · {names}</>}
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
        <div className="p-6 border-t border-[var(--color-line)] flex flex-col gap-6">
          {isSports ? <SportsRecapBody r={r} /> : <EpaHistoryBody r={r} />}
          <div className="flex justify-end pt-2">
            <ReviewButton completionId={item.completion_id} reviewed={!!item.reviewed_at} />
          </div>
        </div>
      )}
    </article>
  );
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
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

function EpaHistoryBody({ r }: { r: Record<string, unknown> }) {
  const activity = (r.activity as { selected?: string; response?: string } | undefined) ?? {};
  const matching = (r.matching as Record<string, string> | undefined) ?? {};
  return (
    <div className="flex flex-col gap-5">
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
    </div>
  );
}

type AIFeedbackShape = { nailed?: string[]; missing?: string[]; try_this?: string };

function SportsRecapBody({ r }: { r: Record<string, unknown> }) {
  const recapUrl = asString(r["find.recap_url"]);
  const v1 = asString(r["article.v1"]);
  const v2 = asString(r["article.v2"]);
  const aiRaw = r["ai.feedback"];
  let ai: AIFeedbackShape | null = null;
  if (aiRaw && typeof aiRaw === "object") ai = aiRaw as AIFeedbackShape;
  else if (typeof aiRaw === "string") {
    try {
      ai = JSON.parse(aiRaw);
    } catch {
      ai = null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="Game" value={`${asString(r["pick.team_a"])} vs ${asString(r["pick.team_b"])}`} />
        <ResponseBlock label="Final score" value={r["pick.final_score"]} />
        <ResponseBlock label="Date" value={r["pick.game_date"]} />
        <ResponseBlock label="His team" value={r["pick.your_team"]} />
      </div>

      {recapUrl && (
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
            Recap watched
          </div>
          <a
            href={recapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-jetbrains)] text-[0.8rem] text-[var(--color-red)] hover:underline break-all"
          >
            {recapUrl}
          </a>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="Top scorer" value={r["watch.top_scorer"]} />
        <ResponseBlock label="Top points" value={r["watch.top_points"]} />
        <ResponseBlock label="Other big stats" value={r["watch.top_other_stat"]} />
        <ResponseBlock label="Surprising stat" value={r["watch.surprising_stat"]} />
        <ResponseBlock label="Won the 4th" value={r["watch.fourth_quarter_winner"]} />
        <ResponseBlock label="What's next" value={r["watch.whats_next"]} />
      </div>
      <ResponseBlock label="Biggest moment" value={r["watch.biggest_moment"]} />

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="Headline option A" value={r["headline.headline_a"]} />
        <ResponseBlock label="Headline option B" value={r["headline.headline_b"]} />
      </div>
      <ResponseBlock label="His final headline" value={r["headline.my_headline"]} big />
      <ResponseBlock label="Lede" value={r["lede.lede"]} />
      <ResponseBlock label="Closer" value={r["closer.closer"]} />

      {ai && (
        <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded p-5 flex flex-col gap-3">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-amber)] mb-1">
            AI feedback (between v1 and v2)
          </div>
          {ai.nailed && ai.nailed.length > 0 && (
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-green)] font-[family-name:var(--font-jetbrains)] mb-1">
                Nailed
              </div>
              <ul className="text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] flex flex-col gap-1">
                {ai.nailed.map((x, i) => (
                  <li key={i}>&ldquo;{x}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}
          {ai.missing && ai.missing.length > 0 && (
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-amber)] font-[family-name:var(--font-jetbrains)] mb-1">
                Missing
              </div>
              <ul className="text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] flex flex-col gap-1">
                {ai.missing.map((x, i) => (
                  <li key={i}>&ldquo;{x}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}
          {ai.try_this && (
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] mb-1">
                Try this in v2
              </div>
              <p className="text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)]">
                &ldquo;{ai.try_this}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded p-4">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
            v1 article
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] text-[var(--color-warm-bone)] leading-relaxed whitespace-pre-wrap">
            {v1 || "—"}
          </p>
        </div>
        <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-4">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] mb-2">
            v2 final
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[1rem] text-[var(--color-bone)] leading-relaxed whitespace-pre-wrap">
            {v2 || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
