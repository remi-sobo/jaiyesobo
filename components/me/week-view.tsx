"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DayBucket } from "@/lib/admin-data";
import type { Task } from "@/lib/data";
import type { WeekKind } from "@/lib/week-class";
import { SUBJECTS, subjectKeyFor } from "@/lib/subjects";

type Props = {
  kind: WeekKind;
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  weekLabel: string;
  days: DayBucket[];
  published: boolean;
  prevWeekStart: string;
  nextWeekStart: string;
  currentWeekStart: string;
  breadcrumb: string;
};

export default function WeekView(props: Props) {
  const router = useRouter();
  const isCurrent = props.kind === "current";
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") router.push(`/me/week?w=${props.prevWeekStart}`);
      else if (e.key === "ArrowRight") router.push(`/me/week?w=${props.nextWeekStart}`);
      else if (e.key === "t" || e.key === "T") router.push("/me/week");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, props.prevWeekStart, props.nextWeekStart]);

  const totalsAll = props.days.reduce((acc, d) => {
    acc.total += d.tasks.length;
    acc.done += d.tasks.filter((t) => t.completion).length;
    return acc;
  }, { total: 0, done: 0 });

  const weekdays = props.days.slice(0, 5);
  const weekdayTotals = weekdays.reduce((acc, d) => {
    acc.total += d.tasks.length;
    acc.done += d.tasks.filter((t) => t.completion).length;
    return acc;
  }, { total: 0, done: 0 });
  const perfectDays = weekdays.filter((d) => d.tasks.length > 0 && d.tasks.every((t) => t.completion)).length;

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 pb-24">
      {/* Shared week nav */}
      <div className="flex justify-between items-center mb-6 pb-5 border-b border-[var(--color-line)]">
        <div className="flex gap-2">
          <Link
            href={`/me/week?w=${props.prevWeekStart}`}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-4 py-2 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-colors"
          >
            ‹ Prev
          </Link>
          <Link
            href="/me/week"
            aria-disabled={isCurrent}
            className={`inline-flex items-center font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-4 py-2 rounded-sm transition-colors ${
              isCurrent
                ? "border border-transparent text-[var(--color-warm-dim)] cursor-default"
                : "border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
            }`}
          >
            Today
          </Link>
          <Link
            href={`/me/week?w=${props.nextWeekStart}`}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-4 py-2 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-colors"
          >
            Next ›
          </Link>
        </div>
        <div className="text-right">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-bone)]">
            Week {props.weekNumber} · {props.weekLabel}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-[0.2em] text-[var(--color-warm-mute)] mt-1">
            {props.breadcrumb}
          </div>
        </div>
      </div>

      {/* Hero score — variant */}
      <Hero kind={props.kind} published={props.published} totals={totalsAll} perfectDays={perfectDays} />

      {/* Grid or empty */}
      {props.kind === "upcoming" && !props.published ? (
        <EmptyUpcoming days={props.days} currentWeekStart={props.currentWeekStart} />
      ) : (
        <>
          <WeekStrip
            days={props.days}
            kind={props.kind}
            onTaskClick={(t) => props.kind === "past" ? setSelectedTask((prev) => (prev?.id === t.id ? null : t)) : null}
            selectedId={selectedTask?.id ?? null}
          />
          {selectedTask && props.kind === "past" && (
            <TaskReceipt task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
          <SubjectBreakdown kind={props.kind} days={props.days} weekdayTotals={weekdayTotals} />
        </>
      )}
    </main>
  );
}

/* ===================== hero score ===================== */

function Hero({
  kind,
  published,
  totals,
  perfectDays,
}: {
  kind: WeekKind;
  published: boolean;
  totals: { total: number; done: number };
  perfectDays: number;
}) {
  if (kind === "upcoming" && !published) {
    return (
      <div className="relative grid grid-cols-1 gap-6 p-10 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded mb-10 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
            <span className="w-6 h-px bg-[var(--color-amber)]" />
            Upcoming
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] mb-3">
            Next week is <span className="italic font-normal text-[var(--color-red)]">loading.</span>
          </h2>
          <p className="font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-snug text-[var(--color-warm-bone)] max-w-[40ch]">
            Dad&apos;s still planning. Check back.
          </p>
        </div>
      </div>
    );
  }

  if (kind === "upcoming") {
    return (
      <div className="relative grid grid-cols-[1fr_auto] gap-8 items-center p-10 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded mb-10 overflow-hidden">
        <div className="absolute -top-1/3 -right-[10%] w-[60%] h-[160%] bg-[radial-gradient(ellipse_at_center,rgba(230,57,70,0.08),transparent_60%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
            <span className="w-6 h-px bg-[var(--color-red)]" />
            Coming up
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] mb-3">
            <span className="italic font-normal text-[var(--color-red)]">{totals.total}</span> things waiting for you.
          </h2>
          <p className="font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-snug text-[var(--color-warm-bone)] max-w-[40ch]">
            Here&apos;s what&apos;s coming up.
          </p>
        </div>
      </div>
    );
  }

  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;
  const label = kind === "past" ? "This week · Archive" : "This week";
  const headline =
    kind === "past"
      ? totals.done === 0
        ? "Nothing shipped this week."
        : `You crushed ${totals.done} this week.`
      : totals.done === 0
      ? "Let's get the week started."
      : `You've crushed ${totals.done}.`;
  const sub =
    kind === "past"
      ? `${totals.done} / ${totals.total} total. ${perfectDays} perfect ${perfectDays === 1 ? "day" : "days"}.`
      : `${totals.total - totals.done} left this week. Keep showing up.`;

  return (
    <div className="relative grid grid-cols-[1fr_auto] gap-8 items-center p-10 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded mb-10 overflow-hidden">
      <div className="absolute -top-1/3 -right-[10%] w-[60%] h-[160%] bg-[radial-gradient(ellipse_at_center,rgba(230,57,70,0.08),transparent_60%)] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          {label}
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] mb-3">
          {kind === "past" ? (
            <>
              You crushed <span className="italic font-normal text-[var(--color-red)]">{totals.done}</span> this week.
            </>
          ) : totals.done === 0 ? (
            <>
              Let&apos;s get the <span className="italic font-normal text-[var(--color-red)]">week</span> started.
            </>
          ) : (
            <>
              You&apos;ve crushed <span className="italic font-normal text-[var(--color-red)]">{totals.done}</span>.
            </>
          )}
        </h2>
        <p className="font-[family-name:var(--font-fraunces)] text-[1.1rem] leading-snug text-[var(--color-warm-bone)] max-w-[40ch]">
          {sub}
        </p>
      </div>

      <BigRing done={totals.done} total={totals.total} pct={pct} />
    </div>
  );
}

function BigRing({ done, total, pct }: { done: number; total: number; pct: number }) {
  const circumference = 2 * Math.PI * 80;
  const offset = circumference * (1 - (total === 0 ? 0 : done / total));
  return (
    <div className="relative w-[180px] h-[180px] z-10">
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
        <circle cx="90" cy="90" r="80" fill="none" stroke="var(--color-line-strong)" strokeWidth="5" />
        <circle
          cx="90"
          cy="90"
          r="80"
          fill="none"
          stroke="var(--color-red)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-5xl leading-none tracking-[-0.03em]">
          {done}
          <span className="text-[var(--color-warm-mute)] font-normal">/{total}</span>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mt-2">
          Done <span className="text-[var(--color-red)] ml-1">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

/* ===================== week strip (grid) ===================== */

function WeekStrip({
  days,
  kind,
  onTaskClick,
  selectedId,
}: {
  days: DayBucket[];
  kind: WeekKind;
  onTaskClick: (t: Task) => void;
  selectedId: string | null;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
      {days.map((day) => (
        <DayCard key={day.date} day={day} kind={kind} onTaskClick={onTaskClick} selectedId={selectedId} />
      ))}
    </div>
  );
}

function DayCard({
  day,
  kind,
  onTaskClick,
  selectedId,
}: {
  day: DayBucket;
  kind: WeekKind;
  onTaskClick: (t: Task) => void;
  selectedId: string | null;
}) {
  const isTodayView = kind === "current" && day.isToday;
  const isPastDay = kind === "past" || (kind === "current" && !day.isToday && new Date(`${day.date}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0)));
  const isFutureDay = kind === "upcoming" || (kind === "current" && !day.isToday && new Date(`${day.date}T00:00:00`) > new Date(new Date().setHours(0, 0, 0, 0)));

  const done = day.tasks.filter((t) => t.completion).length;
  const total = day.tasks.length;
  const perfect = total > 0 && done === total;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const styleClass = [
    "relative flex flex-col rounded border transition-all min-h-[360px] p-3 cursor-default",
    isTodayView
      ? "bg-[var(--color-warm-surface-2)] border-[var(--color-red)] shadow-[0_0_0_1px_var(--color-red),0_10px_40px_-10px_rgba(230,57,70,0.25)] -translate-y-1"
      : day.isWeekend
      ? "bg-[var(--color-warm-bg)] border-[var(--color-line)]"
      : perfect && kind === "past"
      ? "bg-[var(--color-warm-surface)] border-[rgba(230,57,70,0.3)]"
      : "bg-[var(--color-warm-surface)] border-[var(--color-line)] hover:bg-[var(--color-warm-surface-2)] hover:border-[var(--color-line-strong)]",
    isPastDay && kind === "current" ? "opacity-55 hover:opacity-100" : "",
    isFutureDay ? "opacity-50" : "",
  ].join(" ");

  const topBar = perfect && !isTodayView && kind === "past";

  return (
    <div className={styleClass}>
      {isTodayView && (
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-red)] rounded-t" aria-hidden />
      )}
      {topBar && (
        <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-red)] rounded-t" aria-hidden />
      )}

      <div className="pb-3 mb-3 border-b border-[var(--color-line)]">
        <div
          className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-1 ${
            isTodayView ? "text-[var(--color-red)] font-medium" : "text-[var(--color-warm-mute)]"
          }`}
        >
          {isTodayView ? `${day.shortLabel} · Today` : day.shortLabel}
        </div>
        <div
          className={`font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tracking-[-0.03em] ${
            isTodayView ? "italic font-normal text-[var(--color-red)]" : isFutureDay ? "text-[var(--color-warm-mute)]" : ""
          }`}
        >
          {new Date(`${day.date}T00:00:00`).getDate()}
        </div>
        {total > 0 && !isFutureDay && (
          <>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-2">
              <span className={perfect ? "text-[var(--color-red)]" : "text-[var(--color-bone)]"}>
                {done}/{total}
              </span>
              {" · "}
              {pct}%
            </div>
            <div className="h-[3px] bg-[var(--color-line-strong)] rounded mt-1.5 overflow-hidden">
              <div className="h-full bg-[var(--color-red)] rounded transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {day.tasks.length === 0 ? (
          <div className="text-[var(--color-warm-dim)] text-[0.7rem] italic font-[family-name:var(--font-fraunces)] text-center py-4">
            nothing
          </div>
        ) : (
          day.tasks.slice(0, 8).map((t) => {
            const isClickable = kind === "past" && !!t.completion;
            const isSelected = selectedId === t.id;
            return (
              <Pill
                key={t.id}
                task={t}
                isClickable={isClickable}
                isSelected={isSelected}
                onClick={isClickable ? () => onTaskClick(t) : undefined}
              />
            );
          })
        )}
        {day.tasks.length > 8 && (
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] text-center pt-1">
            +{day.tasks.length - 8} more
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  task,
  isClickable,
  isSelected,
  onClick,
}: {
  task: Task;
  isClickable: boolean;
  isSelected: boolean;
  onClick?: () => void;
}) {
  const done = !!task.completion;
  const key = subjectKeyFor(task.subject, task.type);
  const hex = SUBJECTS[key].hex;
  const El = isClickable ? "button" : ("div" as const);
  return (
    <El
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      className={`relative text-left w-full rounded px-2 h-[34px] flex items-center gap-1.5 text-[0.72rem] overflow-hidden whitespace-nowrap transition-colors ${
        done
          ? "bg-[var(--color-warm-surface-3)] text-[var(--color-warm-mute)]"
          : "bg-[var(--color-warm-surface-2)] text-[var(--color-warm-bone)]"
      } ${isClickable ? "cursor-pointer hover:bg-[var(--color-warm-surface-hover)]" : "cursor-default"} ${
        isSelected ? "ring-1 ring-[var(--color-red)]" : ""
      }`}
      style={{ borderLeft: `2px solid ${hex}` }}
    >
      <span className={`truncate block pr-4 ${done ? "line-through decoration-[var(--color-warm-dim)]" : ""}`}>
        {task.title}
      </span>
      {done && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-green)] flex items-center justify-center">
          <span className="block w-[5px] h-[3px] border-l-[1.2px] border-b-[1.2px] border-[var(--color-warm-bg)] -rotate-45 -translate-y-[1px]" />
        </span>
      )}
    </El>
  );
}

/* ===================== task receipt (past week) ===================== */

function TaskReceipt({ task, onClose }: { task: Task; onClose: () => void }) {
  const done = task.completion;
  const subjectColor = SUBJECTS[subjectKeyFor(task.subject, task.type)].hex;

  return (
    <div
      className="mb-10 rounded bg-[var(--color-warm-surface)] border border-[var(--color-line)] overflow-hidden"
      style={{ borderLeftColor: subjectColor, borderLeftWidth: "4px" }}
    >
      <div className="flex justify-between items-start px-6 pt-5 pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1.5">
            {task.subject ?? "Task"}
            {done && (
              <>
                {" · "}
                {new Date(done.completed_at).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </>
            )}
          </div>
          <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl leading-snug tracking-[-0.01em]">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-[var(--color-warm-mute)] mt-1.5 leading-relaxed max-w-[60ch]">
              {task.description}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] text-xl leading-none"
          aria-label="Close receipt"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-5">
        {!done ? (
          <p className="italic text-[var(--color-warm-mute)]">Not completed.</p>
        ) : (
          <ReceiptBody task={task} />
        )}
      </div>
    </div>
  );
}

function ReceiptBody({ task }: { task: Task }) {
  const completion = task.completion;
  if (!completion) return null;

  const hasReflection = !!completion.reflection;
  const rawTask = task as Task & {
    completion: { photo_drive_ids?: string[]; photo_thumbnails?: string[] } | null;
  };
  const thumbnails = (rawTask.completion?.photo_thumbnails ?? []) as string[];

  return (
    <div className="flex flex-col gap-5">
      {thumbnails.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {thumbnails.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded overflow-hidden block hover:border-[var(--color-red)] transition-colors"
              style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className="sr-only">Open photo {i + 1} at full size</span>
            </a>
          ))}
        </div>
      )}
      {hasReflection && (
        <blockquote className="border-l-2 border-[var(--color-amber)] pl-4 font-[family-name:var(--font-fraunces)] italic text-[1.05rem] leading-relaxed text-[var(--color-warm-bone)]">
          &ldquo;{completion.reflection}&rdquo;
        </blockquote>
      )}
      {!hasReflection && thumbnails.length === 0 && task.completion_type === "check" && (
        <p className="text-sm text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
          Marked done at{" "}
          {new Date(completion.completed_at).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}.
        </p>
      )}
    </div>
  );
}

/* ===================== subject breakdown ===================== */

function SubjectBreakdown({
  kind,
  days,
  weekdayTotals,
}: {
  kind: WeekKind;
  days: DayBucket[];
  weekdayTotals: { total: number; done: number };
}) {
  const bySubject = new Map<string, { total: number; done: number; hex: string; label: string }>();
  for (const d of days) {
    for (const t of d.tasks) {
      const key = subjectKeyFor(t.subject, t.type);
      const cfg = SUBJECTS[key];
      const entry = bySubject.get(key) ?? { total: 0, done: 0, hex: cfg.hex, label: cfg.label };
      entry.total += 1;
      if (t.completion) entry.done += 1;
      bySubject.set(key, entry);
    }
  }
  const rows = Array.from(bySubject.entries()).sort((a, b) => b[1].total - a[1].total);

  if (rows.length === 0) return null;

  if (kind === "upcoming") {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-5">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          What&apos;s in the week
        </div>
        <div className="flex gap-1 h-10 rounded overflow-hidden border border-[var(--color-line)]">
          {rows.map(([k, v]) => {
            const pct = (v.total / weekdayTotals.total) * 100;
            return (
              <div
                key={k}
                className="flex items-center justify-center text-[0.55rem] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.15em] text-[var(--color-warm-bg)]"
                style={{ width: `${pct}%`, background: v.hex, minWidth: "32px" }}
                title={`${v.label}: ${v.total}`}
              >
                {v.total}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-[0.65rem] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.15em]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-[var(--color-warm-mute)]">
              <span className="w-3 h-px" style={{ background: v.hex }} />
              {v.label} <span className="text-[var(--color-bone)]">{v.total}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-5">
        <span className="w-6 h-px bg-[var(--color-red)]" />
        By subject
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map(([k, v]) => {
          const pct = v.total === 0 ? 0 : Math.round((v.done / v.total) * 100);
          const badge = kind === "past" ? badgeFor(pct) : null;
          return (
            <div key={k} className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em]">
                  <span className="w-3 h-3 rounded-sm" style={{ background: v.hex }} />
                  {v.label}
                </div>
                {badge && (
                  <span
                    className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm"
                    style={{ background: badge.bg, color: badge.fg }}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tracking-tight">
                {v.done}
                <span className="text-[var(--color-warm-mute)] font-normal">/{v.total}</span>
              </div>
              <div className="h-[3px] bg-[var(--color-line-strong)] rounded mt-3 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${pct}%`, background: v.hex }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function badgeFor(pct: number): { label: string; bg: string; fg: string } | null {
  if (pct === 100) return { label: "🔥 Perfect", bg: "rgba(230,57,70,0.15)", fg: "#ff6b73" };
  if (pct >= 80) return { label: "Great", bg: "rgba(74,222,128,0.15)", fg: "#4ade80" };
  if (pct >= 60) return { label: "Solid", bg: "rgba(244,162,97,0.15)", fg: "#f4a261" };
  return null;
}

/* ===================== empty upcoming state ===================== */

function EmptyUpcoming({ days, currentWeekStart }: { days: DayBucket[]; currentWeekStart: string }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex flex-col rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)] opacity-40 min-h-[240px] p-3"
          >
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
              {day.shortLabel}
            </div>
            <div className="font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tracking-[-0.03em] text-[var(--color-warm-mute)] mt-1">
              {new Date(`${day.date}T00:00:00`).getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <Link
          href={`/me/week?w=${currentWeekStart}`}
          className="inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
        >
          ← Back to this week
        </Link>
      </div>
    </>
  );
}
