"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/data";
import {
  type TimeAnchor,
  type TimeSlot,
  generateTimeSlots,
  findAvailableSlots,
  formatTimeLabel,
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slots = useMemo(() => generateTimeSlots(), []);
  const minutes = task?.estimated_minutes ?? DEFAULT_TASK_MINUTES;
  const available: TimeSlot[] = useMemo(() => {
    if (!task) return [];
    return findAvailableSlots(minutes, anchors, scheduledTasks, slots);
  }, [task, minutes, anchors, scheduledTasks, slots]);

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  async function place(slot: TimeSlot) {
    if (!task) return;
    setBusy(slot.time);
    setError(null);
    try {
      const res = await fetch("/api/me/tasks/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, time: slot.time }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload?.error === "anchor_conflict") {
          setError(`That overlaps with ${payload.anchor_title}. Pick another slot.`);
        } else if (payload?.error === "task_conflict") {
          setError("That overlaps with another task. Pick another slot.");
        } else {
          setError("Couldn't place it. Try again.");
        }
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[rgba(15,14,12,0.86)] backdrop-blur-sm flex items-center justify-center px-4 py-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-7 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
              {task.subject ?? "Task"} · ~{minutes} min
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

        <p className="font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-warm-bone)] mb-4">
          When do you want to do it?
        </p>

        {error && (
          <div className="mb-3 px-3 py-2 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm italic font-[family-name:var(--font-fraunces)]">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 -mr-2 pr-2">
          {available.length === 0 ? (
            <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] text-center py-10">
              No room left in the day. Make space first.
            </p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 list-none">
              {available.map((slot) => {
                const isBusy = busy === slot.time;
                return (
                  <li key={slot.time}>
                    <button
                      type="button"
                      onClick={() => place(slot)}
                      disabled={!!busy}
                      className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded py-3 px-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.1em] text-[var(--color-bone)] hover:bg-[var(--color-red)] hover:border-[var(--color-red)] transition-colors disabled:opacity-50"
                    >
                      {isBusy ? "…" : formatTimeLabel(slot.time)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-end mt-4 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
