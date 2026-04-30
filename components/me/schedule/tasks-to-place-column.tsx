"use client";

import type { Task } from "@/lib/data";
import { SUBJECTS, subjectKeyFor } from "@/lib/subjects";
import { DEFAULT_TASK_MINUTES } from "@/lib/schedule";

type Props = {
  tasks: Task[];
  onPick: (task: Task) => void;
};

export default function TasksToPlaceColumn({ tasks, onPick }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="bg-[var(--color-warm-surface)] border border-dashed border-[var(--color-line-strong)] rounded p-8 text-center">
        <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] text-lg leading-snug">
          All set. Everything has a time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] flex items-center gap-3">
        <span className="w-6 h-px bg-[var(--color-red)]" />
        To place · {tasks.length}
      </div>
      {tasks.map((t) => {
        const subjectHex = SUBJECTS[subjectKeyFor(t.subject, t.type)].hex;
        const minutes = t.estimated_minutes ?? DEFAULT_TASK_MINUTES;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="text-left bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4 hover:bg-[var(--color-warm-surface-2)] hover:border-[var(--color-line-strong)] transition-colors"
            style={{ borderLeft: `3px solid ${subjectHex}` }}
          >
            {t.subject && (
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
                {t.subject}
              </div>
            )}
            <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem] leading-snug text-[var(--color-bone)] mb-1.5">
              {t.title}
            </div>
            <div className="flex justify-between items-baseline gap-3">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                ~{minutes} min
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                Tap to schedule →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
