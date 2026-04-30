"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/data";
import { SUBJECT_KEYS, SUBJECTS } from "@/lib/subjects";

type Props = { task: Task | null; onClose: () => void };

const TYPES = ["homeschool", "habit", "chore", "ball", "family", "other"] as const;
const COMPLETION_TYPES = [
  { value: "photo", label: "Photo" },
  { value: "reflection", label: "Reflection" },
  { value: "check", label: "Check" },
  { value: "photo_and_reflection", label: "Photo + Reflection" },
] as const;
const FLOOR_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90] as const;

export default function TaskEditDrawer({ task, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Task | null>(task);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(task);
    setError(null);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task || !form) return null;

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tasks/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          subject: form.subject,
          link: form.link,
          completion_type: form.completion_type,
          reflection_prompt: form.reflection_prompt,
          estimated_minutes: form.estimated_minutes,
          scheduled_time: form.scheduled_time,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!form) return;
    if (!confirm(`Delete "${form.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tasks/${form.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const needsReflection = form.completion_type === "reflection" || form.completion_type === "photo_and_reflection";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-[var(--color-warm-surface)] border-l border-[var(--color-line)] z-50 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[var(--color-warm-surface)] px-6 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            Edit task
          </div>
          <button onClick={onClose} className="text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] text-lg leading-none">
            ×
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] resize-y"
            />
          </Field>

          <Field label="Subject">
            <select
              value={subjectToKey(form.subject)}
              onChange={(e) => setForm({ ...form, subject: SUBJECTS[e.target.value as keyof typeof SUBJECTS].label })}
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            >
              {SUBJECT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SUBJECTS[k].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-1.5 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] border transition-colors ${
                    form.type === t
                      ? "bg-[var(--color-red)] border-[var(--color-red)] text-[var(--color-bone)]"
                      : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Completion">
            <div className="flex flex-wrap gap-2">
              {COMPLETION_TYPES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, completion_type: c.value })}
                  className={`px-3 py-1.5 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] border transition-colors ${
                    form.completion_type === c.value
                      ? "bg-[var(--color-amber)] border-[var(--color-amber)] text-[var(--color-warm-bg)]"
                      : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          {needsReflection && (
            <Field label="Reflection prompt">
              <textarea
                value={form.reflection_prompt ?? ""}
                onChange={(e) => setForm({ ...form, reflection_prompt: e.target.value })}
                rows={2}
                placeholder="What's the question for him to think about?"
                className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-amber)] resize-y"
              />
            </Field>
          )}

          <Field label="Link (optional)">
            <input
              value={form.link ?? ""}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://…"
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
          </Field>

          <Field label="Floor — minimum minutes">
            <div className="flex flex-wrap gap-2">
              {FLOOR_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, estimated_minutes: m })}
                  className={`px-3 py-1.5 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] border transition-colors ${
                    (form.estimated_minutes ?? 30) === m
                      ? "bg-[var(--color-games-yellow)] border-[var(--color-games-yellow)] text-[var(--color-warm-bg)]"
                      : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="font-[family-name:var(--font-fraunces)] italic text-[0.8rem] text-[var(--color-warm-mute)] mt-1.5">
              The smallest block Jaiye can pick. He can extend on his side.
            </p>
          </Field>

          <Field label="Pre-schedule (optional)">
            <input
              type="time"
              value={form.scheduled_time ? form.scheduled_time.slice(0, 5) : ""}
              onChange={(e) =>
                setForm({ ...form, scheduled_time: e.target.value ? e.target.value : null })
              }
              className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
            <p className="font-[family-name:var(--font-fraunces)] italic text-[0.8rem] text-[var(--color-warm-mute)] mt-1.5">
              Leave empty so it lands in his &ldquo;to place&rdquo; column. Or pin it to a specific time.
            </p>
          </Field>

          {error && <p className="text-sm text-[var(--color-red-soft)] italic">{error}</p>}

          <div className="flex items-center justify-between pt-5 border-t border-[var(--color-line)] mt-3">
            <button
              onClick={del}
              disabled={deleting}
              className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm border border-[var(--color-red)] text-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-[var(--color-bone)] transition-colors disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-5 py-2.5 rounded-sm bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function subjectToKey(subject: string | null): string {
  if (!subject) return "other";
  const clean = subject.split("·")[0].trim().toLowerCase();
  if (clean in SUBJECTS) return clean;
  if (clean === "scripture") return "habit";
  return "other";
}
