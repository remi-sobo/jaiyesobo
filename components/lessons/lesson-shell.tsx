"use client";

import Link from "next/link";

type Props = {
  title: string;
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
};

export default function LessonShell({ title, currentStep, totalSteps, children }: Props) {
  const pct = totalSteps === 0 ? 0 : Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-warm-bg)]">
      <header className="sticky top-0 z-20 bg-[var(--color-warm-bg)]/90 backdrop-blur-sm border-b border-[var(--color-line)]">
        <div className="h-1 bg-[var(--color-warm-surface-2)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-red-deep)] via-[var(--color-red)] to-[var(--color-red-soft)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="max-w-[900px] mx-auto flex items-center justify-between px-6 py-4">
          <Link
            href="/me"
            className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            ← Exit
          </Link>
          <div className="font-[family-name:var(--font-fraunces)] text-sm text-[var(--color-warm-bone)] italic truncate mx-3">
            {title}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] whitespace-nowrap">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
