"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WordSearchDifficulty } from "@/lib/games/word-search";

type TeamOption = { slug: string; label: string };

type Props = {
  teams: TeamOption[];
  initialTeamSlug: string | null;
};

export default function GeneratePackForm({ teams, initialTeamSlug }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"team" | "custom">(initialTeamSlug ? "team" : "team");
  const [teamSlug, setTeamSlug] = useState<string>(initialTeamSlug ?? teams[0]?.slug ?? "");
  const [themeName, setThemeName] = useState<string>("");
  const [difficulty, setDifficulty] = useState<WordSearchDifficulty>("medium");
  const [wordCount, setWordCount] = useState<number>(13);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "team"
          ? { team_slug: teamSlug, difficulty, word_count: wordCount }
          : { theme_name: themeName, difficulty, word_count: wordCount };
      const res = await fetch("/api/games-admin/word-packs/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Failed to generate pack");
        setBusy(false);
        return;
      }
      router.push(`/games-admin/word-packs/${data.id}/verify`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate pack");
      setBusy(false);
    }
  }

  const wordTarget =
    difficulty === "easy"
      ? { min: 8, max: 10, default: 9 }
      : difficulty === "hard"
      ? { min: 16, max: 20, default: 18 }
      : { min: 12, max: 15, default: 13 };

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-6 flex flex-col gap-5"
    >
      <fieldset>
        <legend className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Theme source
        </legend>
        <div className="flex gap-2">
          <ModeButton active={mode === "team"} onClick={() => setMode("team")}>
            Team-based
          </ModeButton>
          <ModeButton active={mode === "custom"} onClick={() => setMode("custom")}>
            Custom theme
          </ModeButton>
        </div>
      </fieldset>

      {mode === "team" ? (
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Team
          </span>
          <select
            value={teamSlug}
            onChange={(e) => setTeamSlug(e.target.value)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          >
            {teams.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Theme name
          </span>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="e.g., Famous Nicknames, MVP Winners"
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            required={mode === "custom"}
          />
        </label>
      )}

      <fieldset>
        <legend className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Difficulty
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {(["easy", "medium", "hard"] as WordSearchDifficulty[]).map((d) => (
            <ModeButton
              key={d}
              active={difficulty === d}
              onClick={() => {
                setDifficulty(d);
                const def =
                  d === "easy" ? 9 : d === "hard" ? 18 : 13;
                setWordCount(def);
              }}
            >
              {d}
            </ModeButton>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          Word count ({wordTarget.min}–{wordTarget.max})
        </span>
        <input
          type="number"
          value={wordCount}
          onChange={(e) => setWordCount(Number(e.target.value))}
          min={wordTarget.min}
          max={wordTarget.max}
          className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2.5 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] w-32"
        />
      </label>

      {error && (
        <div className="text-[var(--color-red-soft)] text-sm border border-[var(--color-red-soft)]/40 rounded px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="self-start bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Generating…" : "Generate pack"}
      </button>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2.5 rounded-sm border transition-colors ${
        active
          ? "border-[var(--color-red)] bg-[var(--color-red)]/15 text-[var(--color-bone)]"
          : "border-[var(--color-line)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
      }`}
    >
      {children}
    </button>
  );
}
