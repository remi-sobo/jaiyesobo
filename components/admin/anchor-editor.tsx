"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TimeAnchor } from "@/lib/schedule";
import { formatTimeLabel, normTime } from "@/lib/schedule";

type Props = { initial: TimeAnchor[] };

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

type RecurMode = "one-time" | "weekdays" | "specific" | "daily";

export default function AnchorEditor({ initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [emoji, setEmoji] = useState("🔒");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [mode, setMode] = useState<RecurMode>("weekdays");
  const [date, setDate] = useState("");
  const [days, setDays] = useState<string[]>(["mon", "wed"]);

  function toggleDay(k: string) {
    setDays((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  }

  async function add() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (start >= end) {
      setError("End time must be after start time.");
      return;
    }
    let recurring_pattern: string | null = null;
    let oneDate: string | null = null;
    if (mode === "one-time") {
      if (!date) {
        setError("Pick a date for one-time anchors.");
        return;
      }
      oneDate = date;
    } else if (mode === "weekdays") {
      recurring_pattern = "weekdays";
    } else if (mode === "daily") {
      recurring_pattern = "daily";
    } else {
      if (days.length === 0) {
        setError("Pick at least one day.");
        return;
      }
      recurring_pattern = days.join(",");
    }

    setBusy("add");
    try {
      const res = await fetch("/api/admin/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          emoji: emoji.trim() || "🔒",
          start_time: start,
          end_time: end,
          date: oneDate,
          recurring_pattern,
        }),
      });
      if (!res.ok) {
        setError("Couldn't create anchor.");
        return;
      }
      setTitle("");
      setSubtitle("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this anchor?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/anchors/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-[-0.01em]">
          Time anchors
        </h2>
      </div>
      <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mb-7 max-w-[60ch]">
        Anchors are calendar blocks Jaiye sees but doesn&apos;t check off. Use them for things like PE,
        lunch, pod, family dinner — anything that locks a time slot.
      </p>

      <div className="grid lg:grid-cols-[1fr_auto] gap-3 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. PE with Coach Dante)"
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        />
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
          placeholder="🔒"
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] w-20 text-center"
        />
      </div>

      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Subtitle (optional, e.g. with Coach Dante)"
        className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] mb-4"
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Start
          </span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            End
          </span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { key: "weekdays", label: "Every weekday" },
          { key: "daily", label: "Every day" },
          { key: "specific", label: "Specific days" },
          { key: "one-time", label: "One time" },
        ] as { key: RecurMode; label: string }[]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            className={`px-3 py-1.5 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] border transition-colors ${
              mode === opt.key
                ? "bg-[var(--color-games-yellow)] border-[var(--color-games-yellow)] text-[var(--color-warm-bg)]"
                : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "specific" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDay(d.key)}
              className={`w-12 h-10 rounded-sm font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.1em] border transition-colors ${
                days.includes(d.key)
                  ? "bg-[var(--color-red)] border-[var(--color-red)] text-[var(--color-bone)]"
                  : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {mode === "one-time" && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] mb-4"
        />
      )}

      {error && (
        <div className="mb-4 px-3 py-2 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm italic font-[family-name:var(--font-fraunces)]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        disabled={busy === "add"}
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-50 transition-colors"
      >
        {busy === "add" ? "Adding…" : "Add anchor"}
      </button>

      <div className="mt-10 pt-8 border-t border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
          Existing · {initial.length}
        </div>
        {initial.length === 0 ? (
          <p className="text-sm italic text-[var(--color-warm-mute)] font-[family-name:var(--font-fraunces)]">
            No anchors yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none">
            {initial.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[auto_1fr_auto] gap-4 items-center bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-4 py-3"
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {a.emoji || "🔒"}
                </span>
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[var(--color-bone)] truncate">
                    {a.title}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                    {formatTimeLabel(normTime(a.start_time))}–{formatTimeLabel(normTime(a.end_time))} ·{" "}
                    {a.recurring_pattern ?? a.date ?? "—"}
                    {a.subtitle && ` · ${a.subtitle}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={busy === a.id}
                  className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors"
                >
                  {busy === a.id ? "…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
