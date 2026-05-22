"use client";

import { useState } from "react";
import ReviewButton from "./review-button";
import CopySqlButton from "./copy-sql-button";
import type { LessonCompletion } from "@/lib/admin-data";

type Props = { item: LessonCompletion };

export default function LessonReceipt({ item }: Props) {
  const [open, setOpen] = useState(false);
  const r = item.responses as Record<string, unknown>;
  const isSports = item.lesson_slug === "sports-journalist-lab";
  const isCurator = item.lesson_slug === "games-curator-onboarding";
  const isJuneteenth = item.lesson_slug === "juneteenth-jaiye";
  const isJuneteenthKemi = item.lesson_slug === "juneteenth-kemi";
  const names = isSports
    ? `${asString(r["pick.team_a"])} vs ${asString(r["pick.team_b"])}`.trim()
    : isCurator
    ? "Jaiye · Curator"
    : isJuneteenth
    ? `Quiz ${asString(r.quiz_score) || "—/4"}`
    : isJuneteenthKemi
    ? `Kemi · Quiz ${asString(r.quiz_score) || "—/4"}`
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
          {isSports ? "🎙️" : isCurator ? "🎮" : isJuneteenth ? "✊" : isJuneteenthKemi ? "✨" : "📚"}
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
          {isSports ? (
            <SportsRecapBody r={r} />
          ) : isCurator ? (
            <GamesCuratorBody r={r} />
          ) : isJuneteenth ? (
            <JuneteenthBody r={r} />
          ) : isJuneteenthKemi ? (
            <JuneteenthKemiBody r={r} />
          ) : (
            <EpaHistoryBody r={r} />
          )}
          <div className="flex justify-end pt-2">
            <ReviewButton completionId={item.completion_id} reviewed={!!item.reviewed_at} />
          </div>
        </div>
      )}
    </article>
  );
}

function GamesCuratorBody({ r }: { r: Record<string, unknown> }) {
  const visit = (r.visit as { noticed?: string } | undefined)?.noticed ?? "";
  const play = (r.play as { prompt_played?: string; ai_verdict?: string } | undefined) ?? {};
  const bugs = Array.isArray(r.bugs) ? (r.bugs as string[]) : [];
  const promptsObj = (r.prompts as Record<string, string[]> | undefined) ?? {};
  const position = promptsObj.position ?? [];
  const team = promptsObj.team ?? [];
  const skill = promptsObj.skill ?? [];
  const spicy = promptsObj.spicy ?? [];
  const favorites = Array.isArray(r.favorites) ? (r.favorites as string[]) : [];

  const allBrainstormed = [...position, ...team, ...skill, ...spicy].length;

  return (
    <div className="flex flex-col gap-7">
      <ResponseBlock label="What he noticed on /games" value={visit} />

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="Top 5 round he played" value={play.prompt_played} />
        <ResponseBlock label="AI verdict (his words)" value={play.ai_verdict} />
      </div>

      {bugs.length > 0 && (
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
            Bugs / ideas · {bugs.length}
          </div>
          <ul className="flex flex-col gap-2 list-none">
            {bugs.map((b, i) => (
              <li
                key={i}
                className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-relaxed pl-4 border-l-2 border-[var(--color-amber)]"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-3">
          Prompts brainstormed · {allBrainstormed}
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <PromptList label="By Position" items={position} />
          <PromptList label="By Team" items={team} />
          <PromptList label="By Skill" items={skill} />
          <PromptList label="Spicy / Weird" items={spicy} />
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-3">
            ★ Starred favorites · {favorites.length}
          </div>
          <ol className="flex flex-col gap-2 list-none mb-5">
            {favorites.map((f, i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span className="font-[family-name:var(--font-jetbrains)] font-bold text-sm text-[var(--color-red)] w-8 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem] text-[var(--color-bone)]">
                  {f}
                </span>
              </li>
            ))}
          </ol>
          <CopySqlButton favorites={favorites} />
        </div>
      )}
    </div>
  );
}

function PromptList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
        {label} · {items.length}
      </div>
      {items.length === 0 ? (
        <p className="text-sm italic text-[var(--color-warm-dim)]">—</p>
      ) : (
        <ul className="flex flex-col gap-1.5 list-none">
          {items.map((p, i) => (
            <li
              key={i}
              className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] text-[var(--color-warm-bone)] leading-snug"
            >
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
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

const JUNETEENTH_QUIZ = [
  {
    key: "q1",
    label: "Q1 — “Juneteenth” = which two words?",
    options: [
      "“June” and “nineteenth”",
      "“June” and “teenager”",
      "“Jubilee” and “month”",
      "“June” and “freedom”",
    ],
    correct: 0,
  },
  {
    key: "q2",
    label: "Q2 — Year Galveston learned they were free",
    options: ["1776", "1863", "1865", "1921"],
    correct: 2,
  },
  {
    key: "q3",
    label: "Q3 — Why it took so long",
    options: [
      "No one had written it down yet",
      "Texas was the most distant part of the Confederacy and freedom needed Union troops to enforce it",
      "The Emancipation Proclamation hadn’t been signed",
      "People in Texas didn’t celebrate holidays",
    ],
    correct: 1,
  },
  {
    key: "q4",
    label: "Q4 — What made slavery illegal everywhere",
    options: [
      "General Order No. 3",
      "The first Juneteenth celebration",
      "The 13th Amendment",
      "The end of the Civil War",
    ],
    correct: 2,
  },
];

function JuneteenthBody({ r }: { r: Record<string, unknown> }) {
  const quiz = (r.quiz as Record<string, unknown> | undefined) ?? {};
  const watch = (r.watch as Record<string, unknown> | undefined) ?? {};
  const report = (r.report as Record<string, unknown> | undefined) ?? {};
  const think = (r.think as Record<string, unknown> | undefined) ?? {};
  const reflect = (r.reflect as Record<string, unknown> | undefined) ?? {};
  const score = asString(r.quiz_score) || asString(quiz.score) || "—/4";
  const q5 = asString(quiz.q5_meaning);

  return (
    <div className="flex flex-col gap-6">
      {/* Scorecard */}
      <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] mb-2">
          Quiz · {score}
        </div>
        <ol className="flex flex-col gap-2 list-none">
          {JUNETEENTH_QUIZ.map((q) => {
            const row = (quiz[q.key] as { picked?: number | null } | undefined) ?? {};
            const picked = typeof row.picked === "number" ? row.picked : null;
            const isCorrect = picked === q.correct;
            return (
              <li key={q.key} className="flex flex-col gap-1">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
                  {q.label}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] ${
                      isCorrect ? "text-[var(--color-green)]" : "text-[var(--color-red-soft)]"
                    }`}
                  >
                    {isCorrect ? "✓ correct" : "✗ wrong"}
                  </span>
                  <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-snug">
                    His pick: {picked === null ? "—" : q.options[picked] ?? "—"}
                  </span>
                  {!isCorrect && (
                    <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] leading-snug">
                      · Correct: {q.options[q.correct]}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ResponseBlock
        label="Q5 — “Freedom delayed is not freedom denied” (his words)"
        value={q5}
        big
      />

      <ResponseBlock
        label="While he watched — what surprised him"
        value={watch.surprise}
      />

      {/* The Dispatch */}
      <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded p-5 flex flex-col gap-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
          Dispatch · Galveston, June 19, 1865
        </div>
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
            Headline
          </div>
          <p className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.15rem] text-[var(--color-bone)] leading-snug">
            {asString(report.headline) || "—"}
          </p>
        </div>
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
            Opening paragraph
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-relaxed whitespace-pre-wrap">
            {asString(report.lede) || "—"}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock
          label="Why families kept Juneteenth alive"
          value={think.why_kept_alive}
        />
        <ResponseBlock
          label="“Second Independence Day” — good name?"
          value={think.second_independence}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="One word for how he feels" value={reflect.word} />
        <ResponseBlock label="One question for Dad" value={reflect.ask_dad} />
      </div>
    </div>
  );
}

const JUNETEENTH_KEMI_QUIZ = [
  { key: "q1", label: "Q1 — What does Juneteenth celebrate?", options: ["Freedom for everyone", "A birthday party", "The first day of school", "A new toy"], correct: 0 },
  { key: "q2", label: "Q2 — What day is Juneteenth?", options: ["January 1", "July 4", "June 19", "December 25"], correct: 2 },
  { key: "q3", label: "Q3 — “Enslaved” means…", options: ["They were on vacation", "They were not free and were treated unfairly", "They were teachers", "They were very rich"], correct: 1 },
  { key: "q4", label: "Q4 — Red food color stands for…", options: ["Blue", "Green", "Red", "Purple"], correct: 2 },
];

function JuneteenthKemiBody({ r }: { r: Record<string, unknown> }) {
  // Defensive: accept either a `quiz` object with `{ q1: { picked }, ... }`
  // shape (matching Jaiye's contract) OR a flat fallback. Both are tolerated
  // because kemisobo.com builds its own client-side mapping.
  const quiz = (r.quiz as Record<string, unknown> | undefined) ?? {};
  const sing = (r.sing as Record<string, unknown> | undefined) ?? {};
  const story = (r.story as Record<string, unknown> | undefined) ?? {};
  const create = (r.create as Record<string, unknown> | undefined) ?? {};
  const reflect = (r.reflect as Record<string, unknown> | undefined) ?? {};
  const score = asString(r.quiz_score) || asString(quiz.score) || "—/4";

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] mb-2">
          Quiz · {score}
        </div>
        <ol className="flex flex-col gap-2 list-none">
          {JUNETEENTH_KEMI_QUIZ.map((q) => {
            const row = (quiz[q.key] as { picked?: number | null } | undefined) ?? {};
            const picked = typeof row.picked === "number" ? row.picked : null;
            const isCorrect = picked === q.correct;
            return (
              <li key={q.key} className="flex flex-col gap-1">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
                  {q.label}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] ${
                      isCorrect ? "text-[var(--color-green)]" : "text-[var(--color-red-soft)]"
                    }`}
                  >
                    {isCorrect ? "✓ correct" : "✗ wrong"}
                  </span>
                  <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] leading-snug">
                    Her pick: {picked === null ? "—" : q.options[picked] ?? "—"}
                  </span>
                  {!isCorrect && (
                    <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] leading-snug">
                      · Correct: {q.options[q.correct]}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="Favorite part of the song" value={sing.favorite} />
        <ResponseBlock label="How Mazie felt" value={story.feeling} />
      </div>

      <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded p-5 flex flex-col gap-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
          Her Freedom Color Story
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            If freedom were a color…
          </span>
          <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.1rem] text-[var(--color-bone)]">
            {asString(create.color) || "—"}
          </span>
        </div>
        <ResponseBlock label="Why she picked it" value={create.why} />
        <ResponseBlock label="About her drawing" value={create.draw} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ResponseBlock label="One thing she learned" value={reflect.learned} />
        <ResponseBlock label="How she feels right now" value={feelingLabel(reflect.feel)} />
      </div>
    </div>
  );
}

function feelingLabel(v: unknown): string {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "happy") return "😊 Happy";
  if (s === "thinking") return "🤔 Thinking";
  if (s === "proud") return "❤️ Proud";
  return asString(v);
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
