"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Task } from "@/lib/data";
import type { TimeAnchor } from "@/lib/schedule";
import TimelineColumn from "./timeline-column";
import TasksToPlaceColumn from "./tasks-to-place-column";
import TimePickerModal from "./time-picker-modal";

type Props = {
  scheduledTasks: Task[];
  unscheduledTasks: Task[];
  anchors: TimeAnchor[];
  viewedDate: string;
  isToday: boolean;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  dateLabel: string;
  weekdayLabel: string;
  relativeLabel: string;
};

const VIEW_PREF_KEY = "jaiye_view_pref";

export default function ScheduleView({
  scheduledTasks,
  unscheduledTasks,
  anchors,
  isToday,
  prevHref,
  nextHref,
  todayHref,
  dateLabel,
  weekdayLabel,
  relativeLabel,
}: Props) {
  const router = useRouter();
  const [picking, setPicking] = useState<Task | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_PREF_KEY, "schedule");
    } catch {
      /* private mode etc */
    }
  }, []);

  return (
    <>
      <DayNav
        weekdayLabel={weekdayLabel}
        dateLabel={dateLabel}
        relativeLabel={relativeLabel}
        prevHref={prevHref}
        nextHref={nextHref}
        todayHref={todayHref}
        isToday={isToday}
      />

      <div className="flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-6">
        <div className="text-[var(--color-warm-mute)]">
          {scheduledTasks.length} placed · {unscheduledTasks.length} to place
        </div>
        <Link
          href="/me/list"
          className="text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors"
          onClick={() => {
            try {
              localStorage.setItem(VIEW_PREF_KEY, "list");
            } catch {
              /* ignore */
            }
          }}
        >
          List view →
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <TimelineColumn
          anchors={anchors}
          tasks={scheduledTasks}
          showNowIndicator={isToday}
          onEditTask={(t) => setPicking(t)}
        />
        <TasksToPlaceColumn tasks={unscheduledTasks} onPick={(t) => setPicking(t)} />
      </div>

      <TimePickerModal
        task={picking}
        anchors={anchors}
        scheduledTasks={scheduledTasks}
        onClose={() => {
          setPicking(null);
          router.refresh();
        }}
      />
    </>
  );
}

function DayNav({
  weekdayLabel,
  dateLabel,
  relativeLabel,
  prevHref,
  nextHref,
  todayHref,
  isToday,
}: {
  weekdayLabel: string;
  dateLabel: string;
  relativeLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  isToday: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-8 pb-6 border-b border-[var(--color-line)]">
      <Link
        href={prevHref}
        className="justify-self-start font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors px-3 py-2 rounded border border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
      >
        ← Prev day
      </Link>

      <div className="text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
          {relativeLabel}
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-tight tracking-[-0.01em]">
          {weekdayLabel} <span className="text-[var(--color-warm-mute)] font-normal">·</span> {dateLabel}
        </div>
        {!isToday && (
          <Link
            href={todayHref}
            className="inline-block mt-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-red)] hover:text-[var(--color-red-soft)] transition-colors"
          >
            Jump to today
          </Link>
        )}
      </div>

      <Link
        href={nextHref}
        className="justify-self-end font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors px-3 py-2 rounded border border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
      >
        Next day →
      </Link>
    </div>
  );
}
