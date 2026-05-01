"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/data";
import {
  type TimeAnchor,
  type TimeSlot,
  generateTimeSlots,
  findAvailableSlots,
  findAvailableEndTimes,
  formatTimeLabel,
  toMinutes,
  normTime,
  DEFAULT_TASK_MINUTES,
} from "@/lib/schedule";

type Props = {
  task: Task | null;
  anchors: TimeAnchor[];
  scheduledTasks: Task[];
  onClose: () => void;
};

export default function TimePickerModal({ task, anchors, scheduledTasks, onClose }: Props) {
  const router = useRouter();
  const isEditing = !!task?.scheduled_time;
  const initialStart = task?.scheduled_time ? normTime(task.scheduled_time) : null;
  const initialEnd = task?.scheduled_end_time ? normTime(task.scheduled_end_time) : null;

  const [chosenStart, setChosenStart] = useState<string | null>(initialStart);
  const [chosenEnd, setChosenEnd] = useState<string | null>(initialEnd);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots = useMemo(() => generateTimeSlots(), []);
  const floor = task?.estimated_minutes ?? DEFAULT_TASK_MINUTES;

  // When editing, exclude the task's own block from conflict detection.
  const otherTasks = useMemo(() => {
    if (!task) return scheduledTasks;
    return scheduledTasks.filter((t) => t.id !== task.id);
  }, [task, scheduledTasks]);

  const availableStarts: TimeSlot[] = useMemo(() => {
    if (!task) return [];
    return findAvailableSlots(floor, anchors, otherTasks, slots);
  }, [task, floor, anchors, otherTasks, slots]);

  const availableEnds: string[] = useMemo(() => {
    if (!task || !chosenStart) return [];
    return findAvailableEndTimes(chosenStart, floor, anchors, otherTasks);
  }, [task, chosenStart, floor, anchors, otherTasks]);

  // Reset internal state when task identity changes
  useEffect(() => {
    setChosenStart(task?.scheduled_time ? normTime(task.scheduled_time) : null);
    setChosenEnd(task?.scheduled_end_time ? normTime(task.scheduled_end_time) : null);
    setError(null);
    setBusy(false);
  }, [task]);

  // Default end = first valid option after picking a start (only when not editing
  // an existing end time)
  useEffect(() => {
    if (chosenStart && !chosenEnd && availableEnds.length > 0) {
      setChosenEnd(availableEnds[0]);
    }
  }, [chosenStart, chosenEnd, availableEnds]);

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  async function place() {
    if (!task || !chosenStart || !chosenEnd) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/tasks/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, time: chosenStart, end_time: chosenEnd }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload?.error === "anchor_conflict") {
          setError(`That overlaps with ${payload.anchor_title}. Pick another slot.`);
        } else if (payload?.error === "task_conflict") {
          setError("That overlaps with another task. Pick another slot.");
        } else if (payload?.error === "below_floor") {
          setError(`End time has to be at least ${payload.floor} minutes after the start.`);
        } else {
          setError("Couldn't save. Try again.");
        }
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function unschedule() {
    if (!task) return;
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
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const phase: "start" | "end" = chosenStart === null ? "start" : "end";
  const durationMin = chosenStart && chosenEnd ? toMinutes(chosenEnd) - toMinutes(chosenStart) : 0;
  const isDirty =
    chosenStart !== initialStart || chosenEnd !== initialEnd;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[rgba(15,14,12,0.86)] backdrop-blur-sm flex items-center justify-center px-4 py-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-7 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
              {task.subject ?? "Task"} · floor {floor} min{isEditing ? " · editing" : ""}
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.2rem] leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] text-xl leading-none -mt-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {phase === "start" && (
          <>
            <p className="font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-warm-bone)] mb-4">
              When are you starting?
            </p>
            {availableStarts.length === 0 ? (
              <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] text-center py-10">
                No room left for a {floor}-minute block. Make space first.
              </p>
            ) : (
              <div className="overflow-y-auto flex-1 -mr-2 pr-2">
                <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 list-none">
                  {availableStarts.map((slot) => (
                    <li key={slot.time}>
                      <button
                        type="button"
                        onClick={() => {
                          setChosenStart(slot.time);
                          setChosenEnd(null);
                        }}
                        className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded py-3 px-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.1em] text-[var(--color-bone)] hover:bg-[var(--color-red)] hover:border-[var(--color-red)] transition-colors"
                      >
                        {formatTimeLabel(slot.time)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {phase === "end" && chosenStart && (
          <>
            <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-4 py-3 mb-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-0.5">
                  Starting
                </div>
                <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg">
                  {formatTimeLabel(chosenStart)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChosenStart(null);
                  setChosenEnd(null);
                }}
                className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors"
              >
                Pick a different start
              </button>
            </div>

            <p className="font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-warm-bone)] mb-4">
              How long? Default is {floor} min — tap a later time to extend.
            </p>

            {availableEnds.length === 0 ? (
              <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] text-center py-10">
                No valid end times. Pick a different start.
              </p>
            ) : (
              <div className="overflow-y-auto flex-1 -mr-2 pr-2">
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 list-none">
                  {availableEnds.map((endT) => {
                    const isChosen = chosenEnd === endT;
                    const dur = toMinutes(endT) - toMinutes(chosenStart);
                    return (
                      <li key={endT}>
                        <button
                          type="button"
                          onClick={() => setChosenEnd(endT)}
                          className={`w-full text-center rounded py-3 px-3 transition-colors border ${
                            isChosen
                              ? "bg-[var(--color-red)] border-[var(--color-red)] text-[var(--color-bone)]"
                              : "bg-[var(--color-warm-bg)] border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-bone)]"
                          }`}
                        >
                          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] opacity-80">
                            {dur} min
                          </div>
                          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-base mt-0.5">
                            ends {formatTimeLabel(endT)}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 px-3 py-2 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm italic font-[family-name:var(--font-fraunces)]">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mt-5 pt-5 border-t border-[var(--color-line)] gap-3 flex-wrap">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
            >
              Cancel
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={unschedule}
                disabled={busy}
                className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] transition-colors disabled:opacity-50"
              >
                Unschedule
              </button>
            )}
          </div>
          {phase === "end" && chosenStart && chosenEnd && (
            <button
              type="button"
              onClick={place}
              disabled={busy || (isEditing && !isDirty)}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-50 transition-colors"
            >
              {busy
                ? "…"
                : `${isEditing ? "Save" : "Place"} ${formatTimeLabel(chosenStart)}–${formatTimeLabel(chosenEnd)} (${durationMin} min)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
