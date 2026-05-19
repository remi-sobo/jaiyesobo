"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlindRankDifficulty, BlindRankKind } from "@/lib/games/blind-rank";

const SUGGESTED_CATEGORIES = [
  "all-time-players",
  "era",
  "achievement",
  "wildcard",
  "international",
];

export default function GenerateBlindRankForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [criteria, setCriteria] = useState("");
  const [difficulty, setDifficulty] = useState<BlindRankDifficulty>("medium");
  const [category, setCategory] = useState("all-time-players");
  const [kind, setKind] = useState<BlindRankKind>("factual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return setError("Topic is required.");
    if (!criteria.trim()) return setError("Criteria is required.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/games-admin/blind-rank/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          criteria: criteria.trim(),
          difficulty,
          category,
          kind,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string; detail?: string };
      if (!res.ok || !data.id) {
        setError(data.detail ?? data.error ?? "Generation failed");
        setBusy(false);
        return;
      }
      router.push(`/games-admin/blind-rank/${data.id}/verify`);
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
      <fieldset>
        <legend className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Topic kind
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <KindButton
            active={kind === "factual"}
            onClick={() => setKind("factual")}
            title="Factual"
            sub="Strict positional · 5-of-5 scoring"
          />
          <KindButton
            active={kind === "opinion"}
            onClick={() => setKind("opinion")}
            title="Opinion"
            sub="AI judges the take · 0-100 score"
          />
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          Topic
        </span>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={
            kind === "opinion"
              ? "e.g. Best Crossovers Ever"
              : "e.g. All-Time Scorers"
          }
          className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          Criteria (what to rank by)
        </span>
        <textarea
          rows={2}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="e.g. Total career NBA points. Defensible top 10 by raw count."
          className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        />
        <span className="text-[var(--color-warm-mute)] text-[0.65rem] leading-snug">
          Be specific. The clearer the criteria, the more defensible the ranking.
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Difficulty
          </span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as BlindRankDifficulty)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          >
            <option value="easy">Easy (well-known list)</option>
            <option value="medium">Medium (fan-level)</option>
            <option value="hard">Hard (diehards only)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Category
          </span>
          <input
            type="text"
            list="blind-rank-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
          <datalist id="blind-rank-categories">
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
        {busy ? "Generating…" : "Draft a top 10"}
      </button>
    </form>
  );
}

function KindButton({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded p-3 border transition-colors ${
        active
          ? "border-[var(--color-red)] bg-[var(--color-warm-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-warm-surface-2)] hover:border-[var(--color-line-strong)]"
      }`}
      style={active ? { borderLeft: "3px solid var(--color-red)" } : undefined}
    >
      <div className="font-[family-name:var(--font-fraunces)] font-semibold text-base text-[var(--color-bone)]">
        {title}
      </div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-1">
        {sub}
      </div>
    </button>
  );
}
