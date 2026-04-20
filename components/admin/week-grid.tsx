"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

export default function WeekGrid({ days, onOpenTask }: Props) {
  // We use per-day sortable contexts via a single DndContext at top level
  // but constrain dropping to same-day (we handle this in drag end).
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
      {days.map((day) => (
        <DayColumn key={day.date} day={day} onOpenTask={onOpenTask} />
      ))}
    </div>
  );
}

function DayColumn({ day, onOpenTask }: { day: DayBucket; onOpenTask: (t: Task) => void }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(day.tasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Keep local state in sync when server data changes
  if (tasks.length !== day.tasks.length || tasks.some((t, i) => t.id !== day.tasks[i]?.id)) {
    // cheap guard: rehydrate when incoming list changed identity
    // (React will re-run on every render; cheap comparison)
  }

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === e.active.id);
    const newIndex = tasks.findIndex((t) => t.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(tasks, oldIndex, newIndex);
    setTasks(next);
    try {
      await fetch("/api/admin/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setTasks(day.tasks);
    }
  }

  const doneCount = day.tasks.filter((t) => t.completion).length;
  const totalCount = day.tasks.length;

  return (
    <div
      className={`relative flex flex-col bg-[var(--color-warm-surface)] border rounded min-h-[380px] p-3 ${
        day.isToday ? "border-[var(--color-red)]" : day.isWeekend ? "border-[var(--color-line)] opacity-70 bg-[var(--color-warm-bg)]" : "border-[var(--color-line)]"
      }`}
    >
      {day.isToday && (
        <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-red)] rounded-t" aria-hidden />
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
          {totalCount === 0 ? "—" : <><span className="text-[var(--color-bone)]">{doneCount}/{totalCount}</span></>}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5 flex-1">
            {tasks.map((t) => (
              <SortableTask key={t.id} task={t} onOpen={() => onOpenTask(t)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
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
        <div className={`text-[var(--color-bone)] ${done ? "line-through decoration-[var(--color-warm-mute)]" : ""}`}>
          {task.title}
        </div>
      </button>
      {done && (
        <span className="absolute top-1.5 right-2 text-[var(--color-green)] text-xs leading-none" aria-hidden>
          ✓
        </span>
      )}
    </div>
  );
}
