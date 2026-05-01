"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/data";
import {
  type TimeAnchor,
  generateTimeSlots,
  toMinutes,
  normTime,
  addMinutes,
  shortTimeLabel,
  DEFAULT_DAY_START,
  DEFAULT_DAY_END,
  DEFAULT_TASK_MINUTES,
  SLOT_INTERVAL_MINUTES,
} from "@/lib/schedule";
import { SUBJECTS, subjectKeyFor } from "@/lib/subjects";

const SLOT_HEIGHT_PX = 56;

type Props = {
  anchors: TimeAnchor[];
  tasks: Task[];
  showNowIndicator: boolean;
  onEditTask: (task: Task) => void;
};

export default function TimelineColumn({ anchors, tasks, showNowIndicator, onEditTask }: Props) {
  const slots = generateTimeSlots();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!showNowIndicator) {
      setNow(null);
      return;
    }
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [showNowIndicator]);

  const events = [
    ...anchors.map((a) => ({
      kind: "anchor" as const,
      start: normTime(a.start_time),
      end: normTime(a.end_time),
      data: a,
    })),
    ...tasks.map((t) => {
      const start = normTime(t.scheduled_time ?? "00:00");
      const end = t.scheduled_end_time
        ? normTime(t.scheduled_end_time)
        : addMinutes(start, t.estimated_minutes ?? DEFAULT_TASK_MINUTES);
      return { kind: "task" as const, start, end, data: t };
    }),
  ].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  const slotMinutesStart = toMinutes(DEFAULT_DAY_START);
  const slotMinutesEnd = toMinutes(DEFAULT_DAY_END);
  const totalHeight = ((slotMinutesEnd - slotMinutesStart) / SLOT_INTERVAL_MINUTES) * SLOT_HEIGHT_PX;

  let nowTop: number | null = null;
  if (now && showNowIndicator) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= slotMinutesStart && nowMin <= slotMinutesEnd) {
      nowTop = ((nowMin - slotMinutesStart) / SLOT_INTERVAL_MINUTES) * SLOT_HEIGHT_PX;
    }
  }

  return (
    <div
      className="relative bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden"
      style={{ height: totalHeight }}
    >
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateRows: `repeat(${slots.length}, ${SLOT_HEIGHT_PX}px)` }}
      >
        {slots.map((slot, i) => {
          const isHourMark = slot.minute === 0;
          return (
            <div
              key={slot.time}
              className={`flex border-t ${
                i === 0 ? "border-transparent" : isHourMark ? "border-[var(--color-line)]" : "border-[var(--color-line)] border-dashed"
              }`}
            >
              <div className="w-16 shrink-0 px-3 pt-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                {isHourMark ? shortTimeLabel(slot.time) : ""}
              </div>
            </div>
          );
        })}
      </div>

      {nowTop !== null && (
        <>
          <div
            className="absolute left-16 right-2 h-px bg-[var(--color-red)] z-30 pointer-events-none"
            style={{ top: nowTop }}
            aria-hidden
          />
          <div
            className="absolute left-[60px] w-2 h-2 rounded-full bg-[var(--color-red)] z-30 pointer-events-none"
            style={{ top: nowTop - 4 }}
            aria-hidden
          />
        </>
      )}

      {events.map((ev) => {
        const startMin = toMinutes(ev.start);
        const endMin = toMinutes(ev.end);
        const top = ((startMin - slotMinutesStart) / SLOT_INTERVAL_MINUTES) * SLOT_HEIGHT_PX;
        const height = Math.max(
          SLOT_HEIGHT_PX - 2,
          ((endMin - startMin) / SLOT_INTERVAL_MINUTES) * SLOT_HEIGHT_PX - 2
        );
        const left = 64;
        const right = 8;

        if (ev.kind === "anchor") {
          const a = ev.data;
          return (
            <div
              key={`anchor-${a.id}`}
              className="absolute z-10 rounded bg-gradient-to-r from-[rgba(245,200,66,0.18)] to-[rgba(245,200,66,0.08)] border border-[rgba(245,200,66,0.3)] border-l-[3px] border-l-[var(--color-games-yellow)] flex items-center gap-3 px-4"
              style={{ top, height, left, right }}
            >
              <span className="text-xl shrink-0" aria-hidden>
                {a.emoji || "🔒"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] leading-tight text-[var(--color-bone)] truncate">
                  {a.title}
                </div>
                {a.subtitle && (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] truncate">
                    {a.subtitle}
                  </div>
                )}
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-games-yellow)] shrink-0">
                {shortTimeLabel(ev.start)}–{shortTimeLabel(ev.end)}
              </div>
            </div>
          );
        }

        const task = ev.data;
        const done = !!task.completion;
        const subjectHex = SUBJECTS[subjectKeyFor(task.subject, task.type)].hex;
        const href = task.completion_type === "lesson"
          ? `/me/lesson/${task.id}`
          : task.completion_type === "reflection"
          ? `/me/reflect/${task.id}`
          : `/me/upload/${task.id}`;

        return (
          <div
            key={`task-${task.id}`}
            className={`absolute z-20 rounded bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] hover:border-[var(--color-line-strong)] flex overflow-hidden ${
              done ? "opacity-65" : ""
            }`}
            style={{ top, height, left, right, borderLeftColor: subjectHex, borderLeftWidth: 3 }}
          >
            <Link
              href={done ? "#" : href}
              className="flex-1 min-w-0 flex items-center gap-3 px-4 hover:bg-[var(--color-warm-surface-3)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                {task.subject && (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] truncate">
                    {task.subject}
                  </div>
                )}
                <div
                  className={`font-[family-name:var(--font-fraunces)] font-semibold text-[1rem] leading-tight truncate ${
                    done ? "line-through decoration-[var(--color-warm-mute)] text-[var(--color-warm-mute)]" : "text-[var(--color-bone)]"
                  }`}
                >
                  {task.title}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                  {shortTimeLabel(ev.start)}–{shortTimeLabel(ev.end)}
                </div>
                {done && (
                  <span
                    className="w-4 h-4 rounded-full bg-[var(--color-red)] flex items-center justify-center"
                    aria-hidden
                  >
                    <span className="block w-[6px] h-[3px] border-l-[1.4px] border-b-[1.4px] border-[var(--color-bone)] -translate-y-[1px] -rotate-45" />
                  </span>
                )}
              </div>
            </Link>

            {!done && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="border-l border-[var(--color-line)] px-3 flex items-center justify-center text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-3)] transition-colors"
                aria-label={`Edit time for ${task.title}`}
                title="Edit time"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 4.5v3.5l2.2 1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
