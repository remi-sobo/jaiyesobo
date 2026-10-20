"use client";

import { useSbAction } from "./use-action";

/** Pulls the latest scores and grades whatever is decided. Same as the nightly job. */
export default function RefreshButton() {
  const { run, busy, error } = useSbAction();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => run("refresh")}
        className="min-h-10 border border-[var(--color-line-strong)] px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] disabled:opacity-40"
      >
        {busy ? "Checking scores…" : "Refresh results"}
      </button>
      {error ? <span className="text-[0.8rem] text-[var(--color-red-soft)]">{error}</span> : null}
    </span>
  );
}
