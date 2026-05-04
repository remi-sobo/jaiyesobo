"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = { label: string; date: string; initial: string; kidName?: string };

export default function DadsNoteEditor({ label, date, initial, kidName }: Props) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(initial.length > 0 ? new Date() : null);

  const save = useCallback(
    async (text: string) => {
      setStatus("saving");
      try {
        const res = await fetch("/api/admin/dad-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, text }),
        });
        if (!res.ok) throw new Error("save failed");
        setStatus("saved");
        setSavedAt(new Date());
      } catch {
        setStatus("error");
      }
    },
    [date]
  );

  const schedule = useCallback(
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
    <div className="flex flex-col gap-2">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
        {label} · {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" })}
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          schedule(e.target.value);
        }}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          save(value);
        }}
        placeholder={`Write a line for ${kidName ?? "Jaiye"}. Something specific, something real.`}
        maxLength={280}
        className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-2 border-l-[var(--color-red)] rounded p-3 min-h-[80px] text-[0.95rem] leading-snug text-[var(--color-warm-bone)] placeholder:text-[var(--color-warm-dim)] italic font-[family-name:var(--font-fraunces)] resize-y focus:outline-none focus:border-[var(--color-red)]"
      />
      <div className="flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        <span>{value.length} / 280</span>
        <span>
          {status === "saving" && "Saving…"}
          {status === "saved" && savedAt && `Saved · ${savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          {status === "error" && "Save failed"}
          {status === "idle" && savedAt && `Saved · ${savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
        </span>
      </div>
    </div>
  );
}
