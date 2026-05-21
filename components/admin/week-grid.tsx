"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DayBucket } from "@/lib/admin-data";
import type { Task } from "@/lib/data";
import { subjectHex, subjectKeyFor } from "@/lib/subjects";
import AddTaskInline from "./add-task-inline";

type Props = {
  days: DayBucket[];
  onOpenTask: (task: Task) => void;
};

const COLUMN_PREFIX = "column:";

export default function WeekGrid({ days, onOpenTask }: Props) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Source of truth for the optimistic drag state. Rehydrated when `days`
  // changes (e.g. after router.refresh).
  const initial = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const d of days) m[d.date] = d.tasks;
    return m;
  }, [days]);
  const [byDate, setByDate] = useState<Record<string, Task[]>>(initial);

  // Keep local state aligned with server data when the week reloads.
  const initialKey = useMemo(
    () =>
      days
        .map((d) => `${d.date}:${d.tasks.map((t) => t.id).join(",")}`)
        .join("|"),
    [days]
  );
  const [trackedKey, setTrackedKey] = useState(initialKey);
  if (trackedKey !== initialKey) {
    setTrackedKey(initialKey);
    setByDate(initial);
  }

  function findDay(taskId: string): string | null {
    for (const [date, list] of Object.entries(byDate)) {
      if (list.some((t) => t.id === taskId)) return date;
    }
    return null;
  }

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    if (activeId === overId) return;

    const sourceDay = findDay(activeId);
    if (!sourceDay) return;

    // Resolve destination day + index. `over.id` is either a task id (drop on
    // another task) or `column:<date>` (drop on an empty area of a column).
    let destDay: string | null;
    let destIndex: number;
    if (overId.startsWith(COLUMN_PREFIX)) {
      destDay = overId.slice(COLUMN_PREFIX.length);
      destIndex = (byDate[destDay] ?? []).length;
    } else {
      destDay = findDay(overId);
      if (!destDay) return;
      destIndex = (byDate[destDay] ?? []).findIndex((t) => t.id === overId);
      if (destIndex < 0) destIndex = (byDate[destDay] ?? []).length;
    }

    const prev = byDate;

    if (sourceDay === destDay) {
      // Same-day reorder.
      const list = byDate[sourceDay] ?? [];
      const oldIdx = list.findIndex((t) => t.id === activeId);
      if (oldIdx < 0 || destIndex < 0 || oldIdx === destIndex) return;
      const next = arrayMove(list, oldIdx, destIndex);
      setByDate({ ...byDate, [sourceDay]: next });
      try {
        const res = await fetch("/api/admin/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
        });
        if (!res.ok) throw new Error("reorder failed");
        router.refresh();
      } catch (err) {
        console.error(err);
        setByDate(prev);
      }
      return;
    }

    // Cross-day move: splice out of source, into destination, PATCH the
    // moved task's `date`, then reorder the destination day so sort_order
    // matches the new ordering. Also reorder the source if anything remains
    // so its sort_order stays compact.
    const sourceList = (byDate[sourceDay] ?? []).slice();
    const destList = (byDate[destDay] ?? []).slice();
    const taskIdx = sourceList.findIndex((t) => t.id === activeId);
    if (taskIdx < 0) return;
    const [moved] = sourceList.splice(taskIdx, 1);
    const movedWithNewDate: Task = { ...moved, date: destDay };
    const insertAt = Math.max(0, Math.min(destIndex, destList.length));
    destList.splice(insertAt, 0, movedWithNewDate);

    setByDate({
      ...byDate,
      [sourceDay]: sourceList,
      [destDay]: destList,
    });

    try {
      const patchRes = await fetch(`/api/admin/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: destDay }),
      });
      if (!patchRes.ok) throw new Error("patch failed");
      const reorderDest = await fetch("/api/admin/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: destList.map((t) => t.id) }),
      });
      if (!reorderDest.ok) throw new Error("reorder dest failed");
      if (sourceList.length > 0) {
        await fetch("/api/admin/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: sourceList.map((t) => t.id) }),
        });
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setByDate(prev);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            tasks={byDate[day.date] ?? []}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DndContext>
  );
}

function DayColumn({
  day,
  tasks,
  onOpenTask,
}: {
  day: DayBucket;
  tasks: Task[];
  onOpenTask: (t: Task) => void;
}) {
  const [adding, setAdding] = useState(false);
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${COLUMN_PREFIX}${day.date}`,
  });

  const doneCount = tasks.filter((t) => t.completion).length;
  const totalCount = tasks.length;

  return (
    <div
      className={`relative flex flex-col bg-[var(--color-warm-surface)] border rounded min-h-[380px] p-3 ${
        day.isToday
          ? "border-[var(--color-red)]"
          : day.isWeekend
          ? "border-[var(--color-line)] opacity-70 bg-[var(--color-warm-bg)]"
          : "border-[var(--color-line)]"
      } ${isOver ? "ring-1 ring-[var(--color-red)]" : ""}`}
    >
      {day.isToday && (
        <span
          className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-red)] rounded-t"
          aria-hidden
        />
      )}
      <div className="flex items-baseline justify-between pb-3 mb-3 border-b border-[var(--color-line)]">
        <div>
          <div
            className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] ${
              day.isToday ? "text-[var(--color-red)]" : "text-[var(--color-warm-mute)]"
            }`}
          >
            {day.isToday ? `${day.shortLabel} · Today` : day.shortLabel}
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight leading-none mt-1">
            {new Date(`${day.date}T00:00:00`).getDate()}
          </div>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
          {totalCount === 0 ? (
            "—"
          ) : (
            <>
              <span className="text-[var(--color-bone)]">
                {doneCount}/{totalCount}
              </span>
            </>
          )}
        </div>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setDropRef} className="flex flex-col gap-1.5 flex-1 min-h-[60px]">
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} onOpen={() => onOpenTask(t)} />
          ))}
          {tasks.length === 0 && (
            <div
              className={`flex-1 rounded border border-dashed text-center font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] py-6 transition-colors ${
                isOver
                  ? "border-[var(--color-red)] text-[var(--color-red)] bg-[rgba(230,57,70,0.06)]"
                  : "border-[var(--color-line)] text-[var(--color-warm-mute)]"
              }`}
            >
              {isOver ? "Drop here" : "Empty"}
            </div>
          )}
        </div>
      </SortableContext>

      {adding ? (
        <AddTaskInline date={day.date} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 py-2 rounded border border-dashed border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] transition-colors"
        >
          + Add task
        </button>
      )}
    </div>
  );
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const done = !!task.completion;
  const subjectKey = subjectKeyFor(task.subject, task.type);
  const accent = subjectHex(task.subject, task.type);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: accent,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`group relative bg-[var(--color-warm-surface-2)] rounded px-2.5 py-2 text-[0.78rem] leading-tight border-l-[2px] hover:bg-[var(--color-warm-surface-3)] transition-colors ${
        done ? "opacity-45" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 flex items-center justify-center text-[var(--color-warm-mute)]"
        aria-label="Drag"
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onOpen} className="block w-full text-left pl-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] mb-0.5">
          {task.subject ?? subjectKey}
        </div>
        <div
          className={`text-[var(--color-bone)] ${
            done ? "line-through decoration-[var(--color-warm-mute)]" : ""
          }`}
        >
          {task.title}
        </div>
      </button>
      {done && (
        <span
          className="absolute top-1.5 right-2 text-[var(--color-green)] text-xs leading-none"
          aria-hidden
        >
          ✓
        </span>
      )}
    </div>
  );
}
