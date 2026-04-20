"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, isoDate } from "@/lib/week";
import { SUBJECTS } from "@/lib/subjects";

type Parsed = {
  day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  title: string;
  description: string | null;
  subject: string;
  type: string;
  completion_type: "photo" | "reflection" | "check" | "photo_and_reflection";
  link: string | null;
  reflection_prompt: string | null;
};

const DAY_INDEX: Record<Parsed["day_of_week"], number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

type Props = { weekStartDate: string; onClose: () => void };

export default function PasteWeek({ weekStartDate, onClose }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function parse() {
    setError(null);
    if (text.trim().length === 0) return;
    setParsing(true);
    try {
      const res = await fetch("/api/parse-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload?.error === "missing_key") {
          setError("Paste parser needs ANTHROPIC_API_KEY in .env.local. See docs/SETUP.md.");
        } else {
          setError(payload?.error ?? "Parse failed. Try rephrasing or splitting the text.");
        }
        return;
      }
      setParsed(payload.tasks as Parsed[]);
    } catch (err) {
      console.error(err);
      setError("Network error. Try again.");
    } finally {
      setParsing(false);
    }
  }

  function removeTask(i: number) {
    if (!parsed) return;
    setParsed(parsed.filter((_, idx) => idx !== i));
  }

  async function addAll() {
    if (!parsed || parsed.length === 0) return;
    setAdding(true);
    const start = new Date(`${weekStartDate}T00:00:00`);
    const tasks = parsed.map((p) => ({
      date: isoDate(addDays(start, DAY_INDEX[p.day_of_week])),
      title: p.title,
      description: p.description,
      type: p.type,
      subject: SUBJECTS[p.subject as keyof typeof SUBJECTS]?.label ?? p.subject,
      link: p.link,
      completion_type: p.completion_type,
      reflection_prompt: p.reflection_prompt,
    }));
    try {
      const res = await fetch("/api/admin/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      if (!res.ok) throw new Error("insert failed");
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to add tasks. Nothing inserted.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mb-6 border border-[var(--color-amber)] rounded bg-[var(--color-warm-surface)] overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-line)]">
        <div className="flex items-center gap-3">
          <span className="w-6 h-px bg-[var(--color-amber)]" />
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-amber)]">
            Paste the week
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          Close
        </button>
      </div>

      {!parsed && (
        <div className="p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Monday: Math page 24, Big Nate chapter 6, write 4 sentences about church. Tuesday: ..."
            className="w-full min-h-[160px] bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-4 text-sm leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] focus:outline-none focus:border-[var(--color-amber)]"
          />
          <div className="flex justify-between items-center mt-4">
            <p className="text-[0.75rem] text-[var(--color-warm-mute)]">
              Claude parses free-form week plans into structured tasks. You review before anything goes live.
            </p>
            <button
              type="button"
              onClick={parse}
              disabled={parsing || text.trim().length === 0}
              className="bg-[var(--color-amber)] text-[var(--color-warm-bg)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em] px-5 py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {parsing ? "Parsing…" : "Parse with Claude"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-[var(--color-red-soft)] italic">{error}</p>}
        </div>
      )}

      {parsed && (
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold mb-1">
                {parsed.length} tasks parsed.
              </div>
              <p className="text-sm text-[var(--color-warm-mute)]">
                Review below. Remove anything off. Click Add all to insert into this week.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setParsed(null)}
              className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
            >
              ← Re-edit text
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2">
            {parsed.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[80px_1fr_auto] gap-3 items-start py-2.5 px-3 bg-[var(--color-warm-surface-2)] rounded border border-[var(--color-line)]"
                style={{ borderLeftColor: SUBJECTS[p.subject as keyof typeof SUBJECTS]?.hex ?? "#8a8578", borderLeftWidth: "2px" }}
              >
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-0.5">
                  {p.day_of_week}
                </div>
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] mb-0.5">
                    {p.subject} · {p.completion_type.replace(/_/g, "+")}
                  </div>
                  <div className="text-sm text-[var(--color-bone)]">{p.title}</div>
                  {p.description && <div className="text-xs text-[var(--color-warm-mute)] mt-0.5">{p.description}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeTask(i)}
                  className="text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-[var(--color-red-soft)] italic">{error}</p>}

          <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={addAll}
              disabled={adding || parsed.length === 0}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-40"
            >
              {adding ? "Adding…" : `Add ${parsed.length} to week`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
