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
    key: "register",
    title: "1. Register Draft Wheel game",
    description:
      "Inserts (or promotes to 'live') the 'draft-wheel' row in the games table so the card shows on /games. Idempotent.",
    endpoint: "/api/admin/games/draft-wheel/register",
  },
  {
    key: "teams",
    title: "2. Seed all 30 NBA franchises",
    description:
      "Flips any non-live draft_team rows to live+verified, then inserts the 7 missing franchises (Hornets, Pelicans, Pacers, Wizards, Kings, Timberwolves, Clippers).",
    endpoint: "/api/admin/games/draft-wheel/seed-teams",
  },
  {
    key: "players",
    title: "3. Import 7 new teams' player pools",
    description:
      "Bulk-inserts ~14 verified iconic players for each of the 7 new franchises. Each team will then be playable in Draft Room AND Draft Wheel (≥12 verified threshold).",
    endpoint: "/api/admin/games/draft-wheel/import-players",
  },
];

export default function SeedDraftWheelPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, StepStatus>>({});
  const [results, setResults] = useState<Record<string, Result | null>>({});

  async function runStep(step: Step): Promise<StepStatus> {
    setStatus((s) => ({ ...s, [step.key]: "running" }));
    setResults((r) => ({ ...r, [step.key]: null }));
    try {
      const res = await fetch(step.endpoint, { method: "POST" });
      const json = (await res.json()) as Result;
      setResults((r) => ({ ...r, [step.key]: json }));
      const next: StepStatus = res.ok ? "ok" : "error";
      setStatus((s) => ({ ...s, [step.key]: next }));
      if (res.ok) router.refresh();
      return next;
    } catch (err) {
      setResults((r) => ({
        ...r,
        [step.key]: { error: err instanceof Error ? err.message : String(err) },
      }));
      setStatus((s) => ({ ...s, [step.key]: "error" }));
      return "error";
    }
  }

  async function runAll() {
    for (const step of STEPS) {
      const result = await runStep(step);
      if (result === "error") break;
    }
  }

  const anyRunning = Object.values(status).some((s) => s === "running");

  return (
    <section className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6 mt-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-5 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1.5">
            Setup · Draft Wheel
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-[-0.02em] leading-tight">
            Bring <span className="italic font-normal text-[var(--color-red)]">Draft Wheel.</span> live
          </h2>
          <p className="text-[var(--color-warm-mute)] text-sm mt-2 max-w-[60ch] leading-relaxed">
            Three idempotent steps. Step 1 registers the game on the hub. Step 2
            promotes existing teams to live and adds the 7 missing franchises.
            Step 3 imports curated rosters for those 7 so they meet the ≥12
            verified threshold and are playable tonight.
          </p>
        </div>
        <button
          type="button"
          onClick={runAll}
          disabled={anyRunning}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
                onClick={() => void runStep(step)}
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
