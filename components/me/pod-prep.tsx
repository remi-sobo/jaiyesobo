"use client";

import { useEffect, useRef, useState } from "react";
import type { PodSection } from "@/lib/sportsbook/pod";

type Status = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1500;
const eyebrow = "font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]";

/** Jaiye's interview prep: each prompt with a text box that saves itself. */
export default function PodPrep({ week, sections, notes }: { week: number; sections: PodSection[]; notes: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(notes);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [savedVals, setSavedVals] = useState<Record<string, string>>(notes);
  const saved = useRef<Record<string, string>>({ ...notes });
  const latest = useRef(values);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Bumped per save so an older response can't overwrite a newer field status.
  const seq = useRef<Record<string, number>>({});

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const setOne = (key: string, s: Status) => setStatus((prev) => ({ ...prev, [key]: s }));
  const isDirty = (key: string) => (latest.current[key] ?? "") !== (saved.current[key] ?? "");
  const isDirtyNow = (key: string) => (values[key] ?? "") !== (savedVals[key] ?? "");

  async function save(key: string) {
    clearTimeout(timers.current[key]);
    if (!isDirty(key)) return;
    const answer = latest.current[key] ?? "";
    const id = (seq.current[key] = (seq.current[key] ?? 0) + 1);
    setOne(key, "saving");
    try {
      const res = await fetch("/api/me/pod-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, key, answer }),
      });
      if (!res.ok) throw new Error("save failed");
      saved.current[key] = answer;
      setSavedVals((prev) => ({ ...prev, [key]: answer }));
      if (seq.current[key] === id) setOne(key, isDirty(key) ? "idle" : "saved");
    } catch {
      if (seq.current[key] === id) setOne(key, "error");
    }
  }

  function change(key: string, value: string) {
    latest.current = { ...latest.current, [key]: value };
    setValues(latest.current);
    setOne(key, "idle");
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void save(key), AUTOSAVE_MS);
  }

  const allKeys = sections.flatMap((s) => s.prompts.map((p) => p.key));
  const dirtyCount = allKeys.filter(isDirtyNow).length;
  const saving = allKeys.some((k) => status[k] === "saving");
  const failed = allKeys.some((k) => status[k] === "error");

  return (
    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav aria-label="Sections" className="hidden lg:block">
        <ul className="sticky top-6 flex flex-col gap-3">
          {sections.map((s) => (
            <li key={s.key}>
              <a href={`#${s.key}`} className={`${eyebrow} block py-1 hover:text-[var(--color-red)] transition-colors`}>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-8 min-w-0">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={saving || dirtyCount === 0}
            onClick={() => allKeys.filter(isDirtyNow).forEach((k) => void save(k))}
            className="min-h-11 px-6 rounded-sm bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save all"}
          </button>
          <span role="status" className={`${eyebrow} ${failed ? "!text-[var(--color-red)]" : ""}`}>
            {failed ? "Some answers didn't save. Try again." : dirtyCount > 0 ? `${dirtyCount} unsaved` : "Everything is saved"}
          </span>
        </div>

        {sections.map((s) => (
          <section
            key={s.key}
            id={s.key}
            className="scroll-mt-6 p-6 md:p-8 bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded"
          >
            <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.6rem] tracking-[-0.01em]">{s.title}</h2>
            <p className="mt-2 text-[1.05rem] leading-relaxed text-[var(--color-warm-mute)]">{s.lead}</p>

            {s.table ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[0.95rem]">
                  <thead>
                    <tr>
                      {s.table.columns.map((c) => (
                        <th key={c} className={`${eyebrow} py-2 pr-4 font-normal border-b border-[var(--color-line)]`}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--color-line)] align-top">
                        {row.map((cell, j) => (
                          <td key={j} className="py-2.5 pr-4 leading-snug">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-7">
              {s.prompts.map((p) => {
                const st = status[p.key] ?? "idle";
                return (
                  <div key={p.key}>
                    <label htmlFor={`pod-${p.key}`} className="block text-[1.1rem] leading-relaxed font-medium">
                      {p.text}
                    </label>
                    <textarea
                      id={`pod-${p.key}`}
                      value={values[p.key] ?? ""}
                      rows={3}
                      maxLength={4000}
                      onChange={(e) => change(p.key, e.target.value)}
                      onBlur={() => void save(p.key)}
                      className="mt-2 w-full min-h-[5.5rem] p-3 text-[1.05rem] leading-relaxed bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded-sm"
                    />
                    <div className="mt-1 h-5 flex items-center gap-3" aria-live="polite">
                      {st === "saving" ? <span className={eyebrow}>Saving…</span> : null}
                      {st === "saved" ? <span className={eyebrow}>Saved</span> : null}
                      {st === "error" ? (
                        <>
                          <span className={`${eyebrow} !text-[var(--color-red)]`}>Couldn&apos;t save, try again</span>
                          <button type="button" onClick={() => void save(p.key)} className={`${eyebrow} underline min-h-11`}>
                            Retry
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
