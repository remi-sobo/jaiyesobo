"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StepStatus = "idle" | "running" | "ok" | "error";
type Result = { ok?: boolean; error?: string; [k: string]: unknown };

type Step = {
  key: string;
  title: string;
  description: string;
  endpoint: string;
};

const STEPS: Step[] = [
  {
    key: "user",
    title: "1. Create Kemi user",
    description:
      "Inserts Kemi as a kid user with bcrypt-hashed PIN from KEMI_PIN env. Idempotent.",
    endpoint: "/api/admin/seed-kemi",
  },
  {
    key: "anchors",
    title: "2. Default anchors",
    description:
      "Power Hour 09:00–10:00 and Lunch 12:00–13:00 (weekdays). Skipped if titles already exist.",
    endpoint: "/api/admin/seed-kemi/anchors",
  },
  {
    key: "starter",
    title: "3. Starter week (×2)",
    description:
      "Wipes Kemi's tasks for the next two work weeks (10 weekdays) and inserts 4 starter tasks per day plus the welcome note. Re-runnable any time.",
    endpoint: "/api/admin/seed-kemi/starter-week",
  },
];

export default function SeedKemiPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, StepStatus>>({});
  const [results, setResults] = useState<Record<string, Result | null>>({});

  async function runStep(step: Step) {
    setStatus((s) => ({ ...s, [step.key]: "running" }));
    setResults((r) => ({ ...r, [step.key]: null }));
    try {
      const res = await fetch(step.endpoint, { method: "POST" });
      const json = (await res.json()) as Result;
      setResults((r) => ({ ...r, [step.key]: json }));
      setStatus((s) => ({ ...s, [step.key]: res.ok ? "ok" : "error" }));
      if (res.ok) router.refresh();
    } catch (err) {
      setResults((r) => ({
        ...r,
        [step.key]: { error: err instanceof Error ? err.message : String(err) },
      }));
      setStatus((s) => ({ ...s, [step.key]: "error" }));
    }
  }

  async function runAll() {
    for (const step of STEPS) {
      await runStep(step);
      // If a step errors, stop the chain.
      if (status[step.key] === "error") break;
    }
  }

  const anyRunning = Object.values(status).some((s) => s === "running");

  return (
    <section className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-5 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1.5">
            Setup · Kemi
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-[-0.02em] leading-tight">
            Bring <span className="italic font-normal" style={{ color: "#C83C78" }}>Kemi.</span> online
          </h2>
          <p className="text-[var(--color-warm-mute)] text-sm mt-2 max-w-[60ch] leading-relaxed">
            Run these in order. Each is idempotent — safe to re-run if something
            looks off. Step 1 must succeed before 2 and 3.
          </p>
        </div>
        <button
          type="button"
          onClick={runAll}
          disabled={anyRunning}
          className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-sm text-[var(--color-bone)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          style={{ backgroundColor: "#C83C78" }}
        >
          {anyRunning ? "Running…" : "Run all 3 →"}
        </button>
      </header>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const st = status[step.key] ?? "idle";
          const result = results[step.key];
          return (
            <li
              key={step.key}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-6 items-start bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-[family-name:var(--font-fraunces)] text-base font-semibold leading-tight">
                    {step.title}
                  </h3>
                  <StatusPill status={st} />
                </div>
                <p className="text-[var(--color-warm-mute)] text-sm leading-snug">
                  {step.description}
                </p>
                {result && (
                  <pre className="mt-2 text-[0.65rem] font-[family-name:var(--font-jetbrains)] text-[var(--color-warm-mute)] bg-[var(--color-warm-surface-3)] border border-[var(--color-line)] rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
              <button
                type="button"
                onClick={() => runStep(step)}
                disabled={st === "running" || anyRunning}
                className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2.5 rounded-sm border border-[var(--color-line)] text-[var(--color-bone)] hover:border-[var(--color-bone)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-start md:self-center"
              >
                {st === "running" ? "Running…" : st === "ok" ? "Run again" : "Run"}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StatusPill({ status }: { status: StepStatus }) {
  if (status === "idle") return null;
  const map: Record<Exclude<StepStatus, "idle">, { label: string; color: string }> = {
    running: { label: "Running…", color: "#E8956A" },
    ok: { label: "OK", color: "#7BA05B" },
    error: { label: "Failed", color: "#E63946" },
  };
  const { label, color } = map[status];
  return (
    <span
      className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm"
      style={{ color, borderColor: color, borderWidth: 1, borderStyle: "solid" }}
    >
      {label}
    </span>
  );
}
