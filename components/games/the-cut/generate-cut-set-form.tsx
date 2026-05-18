"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CutSetDifficulty } from "@/lib/games/the-cut";

const SUGGESTED_CATEGORIES = [
  "awards",
  "champions",
  "scoring",
  "draft",
  "teams",
  "college",
  "international",
  "era",
  "general",
];

export default function GenerateCutSetForm() {
  const router = useRouter();
  const [criterion, setCriterion] = useState("");
  const [difficulty, setDifficulty] = useState<CutSetDifficulty>("medium");
  const [category, setCategory] = useState("awards");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!criterion.trim()) {
      setError("Criterion is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/games-admin/cut-sets/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          criterion: criterion.trim(),
          difficulty,
          category,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string; detail?: string };
      if (!res.ok || !data.id) {
        setError(data.detail ?? data.error ?? "Generation failed");
        setBusy(false);
        return;
      }
      router.push(`/games-admin/cut-sets/${data.id}/verify`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6 flex flex-col gap-5"
    >
      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          Criterion
        </span>
        <input
          type="text"
          value={criterion}
          onChange={(e) => setCriterion(e.target.value)}
          placeholder="e.g. Won Sixth Man of the Year"
          className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        />
        <span className="text-[var(--color-warm-mute)] text-[0.65rem] leading-snug">
          What ties the 4 keeps together. Be specific — vague criteria make for fuzzy puzzles.
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Difficulty
          </span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CutSetDifficulty)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          >
            <option value="easy">Easy (household names)</option>
            <option value="medium">Medium (mixed)</option>
            <option value="hard">Hard (deep cuts)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Category
          </span>
          <input
            type="text"
            list="cut-set-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
          <datalist id="cut-set-categories">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      {error && (
        <div className="text-[var(--color-red-soft)] text-sm border border-[var(--color-red-soft)]/40 rounded px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50 self-start"
      >
        {busy ? "Generating…" : "Draft a set"}
      </button>
    </form>
  );
}
