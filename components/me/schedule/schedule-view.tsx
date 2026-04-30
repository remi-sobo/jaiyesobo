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
};

const VIEW_PREF_KEY = "jaiye_view_pref";

export default function ScheduleView({ scheduledTasks, unscheduledTasks, anchors }: Props) {
  const router = useRouter();
  const [picking, setPicking] = useState<Task | null>(null);

  // Persist that this user landed on the schedule view (so the toggle remembers).
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_PREF_KEY, "schedule");
    } catch {
      /* private mode etc */
    }
  }, []);

  return (
    <>
      <div className="flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-6">
        <div className="text-[var(--color-warm-mute)]">
          Schedule · {scheduledTasks.length} placed · {unscheduledTasks.length} to place
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
        <TimelineColumn anchors={anchors} tasks={scheduledTasks} />
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
