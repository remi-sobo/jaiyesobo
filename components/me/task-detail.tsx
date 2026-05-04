"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Task } from "@/lib/data";
import { SUBJECTS, subjectKeyFor } from "@/lib/subjects";
import { effectiveEndTime, normTime, formatTimeLabel } from "@/lib/schedule";
import UndoButton from "./undo-button";

const GRACE_MS = 10 * 60 * 1000;

type Props = { task: Task };

export default function TaskDetail({ task }: Props) {
  const router = useRouter();
  const completion = task.completion;
  const done = !!completion;
  const accent = SUBJECTS[subjectKeyFor(task.subject, task.type)].hex;

  const start = task.scheduled_time ? normTime(task.scheduled_time) : null;
  const end = effectiveEndTime(task);
  const scheduled = !!start;

  return (
    <main className="max-w-[820px] mx-auto px-6 py-10 pb-32">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--color-line)]">
        <Link
          href="/me"
          className="flex items-center gap-2 text-[var(--color-warm-mute)] hover:text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] transition-colors"
        >
          <span>←</span> Back to Today
        </Link>
        {scheduled && (
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            {start && end
              ? `${formatTimeLabel(start)}–${formatTimeLabel(end)}`
              : start
                ? formatTimeLabel(start)
                : "Not scheduled"}
          </div>
        )}
      </div>

      <article
        className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md px-8 py-7 mb-8"
        style={{ borderLeftColor: accent, borderLeftWidth: "4px" }}
      >
        {task.subject && (
          <div
            className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] mb-3"
            style={{ color: accent }}
          >
            {task.subject}
          </div>
        )}
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em] mb-3">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-[var(--color-warm-bone)] leading-relaxed max-w-[60ch] text-[1.05rem]">
            {task.description}
          </p>
        )}
        {task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-red)] hover:text-[var(--color-red-soft)] border-b border-[var(--color-red)] pb-0.5 transition-colors"
          >
            Open link <span>↗</span>
          </a>
        )}
        {task.reflection_prompt && !done && (
          <div className="mt-5 pt-5 border-t border-[var(--color-line)]">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-amber)] mb-2">
              Reflect
            </div>
            <p className="font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-snug text-[var(--color-warm-bone)] max-w-[55ch]">
              {task.reflection_prompt}
            </p>
          </div>
        )}
      </article>

      {done ? <CompletedView task={task} /> : <CompletionCTA task={task} />}

      <ScheduleControls task={task} onChange={() => router.refresh()} />
    </main>
  );
}

function CompletionCTA({ task }: { task: Task }) {
  const ct = task.completion_type;

  if (ct === "check") return <CheckCompletion task={task} />;
  if (ct === "lesson") {
    return (
      <CtaCard
        leadingTag="🧠 Lesson"
        title="Time to think."
        body="Tap below to start the lesson."
        href={`/me/lesson/${task.id}`}
        cta="Start lesson →"
      />
    );
  }
  if (ct === "reflection") {
    return (
      <CtaCard
        leadingTag="✎ Reflect"
        title="Write what you're thinking."
        body="A few sentences. Honest words."
        href={`/me/reflect/${task.id}`}
        cta="Reflect →"
      />
    );
  }
  // photo or photo_and_reflection
  return (
    <CtaCard
      leadingTag="📷 Photo"
      title={ct === "photo_and_reflection" ? "Take a photo + reflect." : "Take a photo."}
      body={
        ct === "photo_and_reflection"
          ? "Send Dad a photo and a few sentences about it."
          : "Send Dad a photo of your work."
      }
      href={`/me/upload/${task.id}`}
      cta={ct === "photo_and_reflection" ? "Photo + Reflect →" : "Take photo →"}
    />
  );
}

function CtaCard({
  leadingTag,
  title,
  body,
  href,
  cta,
}: {
  leadingTag: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center p-7 bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded">
      <div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-2">
          {leadingTag}
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.4rem] tracking-[-0.01em] leading-snug mb-1">
          {title}
        </div>
        <p className="text-[0.95rem] text-[var(--color-warm-mute)] leading-relaxed">{body}</p>
      </div>
      <Link
        href={href}
        className="font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-7 py-4 rounded-sm bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-soft)] transition-colors whitespace-nowrap text-center"
      >
        {cta}
      </Link>
    </div>
  );
}

function CheckCompletion({ task }: { task: Task }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkOff() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (!res.ok) {
        setError("Couldn't mark it done. Try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md p-8 text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
        Did you do it?
      </div>
      <button
        type="button"
        onClick={checkOff}
        disabled={busy}
        className="inline-flex items-center justify-center gap-3 bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-base uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-50 transition-colors"
      >
        {busy ? "Saving…" : "I did it ✓"}
      </button>
      {error && (
        <p className="mt-4 text-sm text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
          {error}
        </p>
      )}
    </div>
  );
}

function CompletedView({ task }: { task: Task }) {
  const completion = task.completion!;
  const completedAt = new Date(completion.completed_at);
  const withinGrace = Date.now() - completedAt.getTime() < GRACE_MS;

  // Pull thumbnails from raw completion if present (Task type doesn't include them).
  const raw = completion as typeof completion & { photo_thumbnails?: string[] | null };
  const thumbs = raw.photo_thumbnails ?? [];

  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-green)] rounded-md p-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-green)] mb-1.5">
            ✓ Done
          </div>
          <div className="font-[family-name:var(--font-fraunces)] text-lg leading-snug text-[var(--color-warm-bone)]">
            Completed at{" "}
            {completedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        {withinGrace && <UndoButton taskId={task.id} completedAt={completion.completed_at} />}
      </div>

      {thumbs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
          {thumbs.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded overflow-hidden block hover:border-[var(--color-red)] transition-colors"
              style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className="sr-only">Photo {i + 1}</span>
            </a>
          ))}
        </div>
      )}

      {completion.reflection && (
        <blockquote className="mt-5 border-l-2 border-[var(--color-amber)] pl-4 font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-relaxed text-[var(--color-warm-bone)]">
          &ldquo;{completion.reflection}&rdquo;
        </blockquote>
      )}
    </div>
  );
}

function ScheduleControls({ task, onChange }: { task: Task; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (task.completion) return null; // Don't allow re-scheduling completed tasks here.

  async function unschedule() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/tasks/unschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id }),
      });
      if (!res.ok) {
        setError("Couldn't unschedule. Try again.");
        return;
      }
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-4 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em]">
      <div className="text-[var(--color-warm-mute)]">
        {task.scheduled_time ? "Need to change the time? Pick a slot from the schedule." : "Not on your timeline yet — pick a time from the schedule."}
      </div>
      <div className="flex gap-3">
        <Link
          href="/me"
          className="px-4 py-2.5 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:border-[var(--color-bone)] transition-colors"
        >
          Adjust on schedule
        </Link>
        {task.scheduled_time && (
          <button
            type="button"
            onClick={unschedule}
            disabled={busy}
            className="px-4 py-2.5 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] transition-colors disabled:opacity-50"
          >
            {busy ? "…" : "Unschedule"}
          </button>
        )}
      </div>
      {error && (
        <p className="basis-full text-sm text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
          {error}
        </p>
      )}
    </div>
  );
}
