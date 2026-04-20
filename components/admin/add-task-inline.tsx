"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECT_KEYS, SUBJECTS } from "@/lib/subjects";

type Props = { date: string; onDone: () => void };

const COMPLETION_TYPES = [
  { value: "photo", label: "Photo" },
  { value: "reflection", label: "Reflect" },
  { value: "check", label: "Check" },
  { value: "photo_and_reflection", label: "Both" },
] as const;

export default function AddTaskInline({ date, onDone }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<keyof typeof SUBJECTS>("math");
  const [completionType, setCompletionType] = useState<(typeof COMPLETION_TYPES)[number]["value"]>("photo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (title.trim().length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const typeForCompletion =
        completionType === "check" && (subject === "habit" || subject === "family") ? subject : "homeschool";
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          title: title.trim(),
          type: subject === "ball" ? "ball" : typeForCompletion,
          subject: SUBJECTS[subject].label,
          completion_type: completionType,
        }),
      });
      if (!res.ok) throw new Error("insert failed");
      setTitle("");
      onDone();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-1 p-2.5 bg-[var(--color-warm-surface-2)] rounded border border-[var(--color-red)]">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title…"
        className="bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
      />
      <div className="flex gap-1.5">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as keyof typeof SUBJECTS)}
          className="flex-1 bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded px-2 py-1.5 text-[0.7rem] text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        >
          {SUBJECT_KEYS.map((k) => (
            <option key={k} value={k}>
              {SUBJECTS[k].label}
            </option>
          ))}
        </select>
        <select
          value={completionType}
          onChange={(e) => setCompletionType(e.target.value as typeof completionType)}
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded px-2 py-1.5 text-[0.7rem] text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        >
          {COMPLETION_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1.5 justify-end">
        <button
          onClick={onDone}
          className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] px-2 py-1"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || title.trim().length === 0}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] px-3 py-1 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 transition-colors"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
      {error && <div className="text-[0.7rem] text-[var(--color-red-soft)] italic">{error}</div>}
    </div>
  );
}
