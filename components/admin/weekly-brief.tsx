"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = { weekStartDate: string; initial: string };

export default function WeeklyBrief({ weekStartDate, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [open, setOpen] = useState(initial.length > 0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initial.length > 0 ? new Date() : null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (text: string) => {
      setStatus("saving");
      try {
        const res = await fetch("/api/admin/weekly-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStartDate, bodyMarkdown: text }),
        });
        if (!res.ok) throw new Error("save failed");
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch {
        setStatus("error");
      }
    },
    [weekStartDate]
  );

  const scheduleSave = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(next), 800);
    },
    [save]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <section className="mb-6 border border-[var(--color-line)] rounded bg-[var(--color-warm-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            Weekly Brief
          </span>
          {!open && value.length > 0 && (
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-warm-dim)] truncate max-w-[50ch]">
              · {firstLine(value)}
            </span>
          )}
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-warm-mute)]">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5">
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              scheduleSave(e.target.value);
            }}
            onBlur={() => {
              if (timer.current) clearTimeout(timer.current);
              save(value);
            }}
            placeholder="Sunday thinking. Where is Jaiye this week? What's the intent? External factors? What am I reinforcing?"
            className="w-full min-h-[140px] bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-4 text-[0.95rem] leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] focus:outline-none focus:border-[var(--color-red)] font-[family-name:var(--font-fraunces)]"
          />
          <div className="mt-2 flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
            <span>{value.length} chars · markdown ok</span>
            <span>{statusLabel(status, lastSavedAt)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function firstLine(s: string): string {
  return s.split("\n")[0].slice(0, 80);
}

function statusLabel(status: string, lastSavedAt: Date | null): string {
  if (status === "saving") return "Saving…";
  if (status === "error") return "Save failed — try again";
  if (status === "saved" && lastSavedAt) return `Saved · ${relativeTime(lastSavedAt)}`;
  if (lastSavedAt) return `Saved · ${relativeTime(lastSavedAt)}`;
  return "";
}

function relativeTime(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
