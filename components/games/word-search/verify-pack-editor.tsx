"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WordPackRow } from "@/lib/games/word-search-data";
import { gridSizeFor, normalizeWord, validateWord, type WordSearchDifficulty } from "@/lib/games/word-search";

type Props = { pack: WordPackRow };

type WordRow = { word: string; hint: string; error?: string };

export default function VerifyPackEditor({ pack }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(pack.payload.title);
  const [subtitle, setSubtitle] = useState(pack.payload.subtitle);
  const [difficulty, setDifficulty] = useState<WordSearchDifficulty>(pack.payload.difficulty);
  const [words, setWords] = useState<WordRow[]>(
    pack.payload.words.map((w) => ({ word: w.word, hint: w.hint }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gridSize = gridSizeFor(difficulty);
  const isLive = pack.status === "live" && pack.verification_status === "verified";

  // Crossword grid status (lives on the same payload). Cleared whenever
  // the curator saves edited words — that's how staleness is signalled.
  const hasCrossword = !!pack.payload.crossword_grid;
  const [crosswordBusy, setCrosswordBusy] = useState(false);
  const [crosswordResult, setCrosswordResult] = useState<{
    placed?: number;
    dropped?: { word: string; reason: string }[];
    error?: string;
  } | null>(null);

  async function generateCrossword() {
    setCrosswordBusy(true);
    setCrosswordResult(null);
    try {
      const res = await fetch(
        `/api/games-admin/word-packs/${pack.id}/generate-crossword`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        placed_count?: number;
        dropped?: { word: string; reason: string }[];
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.ok) {
        setCrosswordResult({
          error: data.detail ?? data.error ?? "Couldn't generate grid",
          dropped: data.dropped,
        });
        setCrosswordBusy(false);
        return;
      }
      setCrosswordResult({ placed: data.placed_count, dropped: data.dropped });
      setCrosswordBusy(false);
      router.refresh();
    } catch {
      setCrosswordResult({ error: "Network error" });
      setCrosswordBusy(false);
    }
  }

  function updateWord(idx: number, patch: Partial<WordRow>) {
    setWords((ws) => ws.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function removeWord(idx: number) {
    setWords((ws) => ws.filter((_, i) => i !== idx));
  }

  function addWord() {
    setWords((ws) => [...ws, { word: "", hint: "" }]);
  }

  function buildPayload() {
    const cleaned: WordRow[] = [];
    for (const w of words) {
      const normalized = normalizeWord(w.word);
      if (normalized.length === 0) continue;
      const v = validateWord(w.word);
      if (!v.ok) {
        cleaned.push({ word: w.word, hint: w.hint, error: v.error });
        continue;
      }
      if (v.word.length > gridSize) {
        cleaned.push({
          word: w.word,
          hint: w.hint,
          error: `longer than ${gridSize}-cell grid`,
        });
        continue;
      }
      cleaned.push({ word: v.word, hint: w.hint, error: undefined });
    }
    return cleaned;
  }

  async function save(opts: { publish: boolean }) {
    setError(null);
    const cleaned = buildPayload();
    setWords(cleaned);
    const bad = cleaned.filter((w) => w.error);
    if (bad.length > 0) {
      setError(`${bad.length} word${bad.length === 1 ? "" : "s"} need fixing`);
      return;
    }
    if (cleaned.length < 4) {
      setError("Need at least 4 words");
      return;
    }
    setBusy(true);
    const payload = {
      theme_slug: pack.payload.theme_slug,
      team_slug: pack.payload.team_slug,
      title: title.trim(),
      subtitle: subtitle.trim(),
      difficulty,
      grid_size: gridSize,
      words: cleaned.map((w) => ({ word: w.word, hint: w.hint.trim() })),
    };
    const body: Record<string, unknown> = { payload };
    if (opts.publish) {
      body.status = "live";
      body.verification_status = "verified";
    }
    const res = await fetch(`/api/games-admin/word-packs/${pack.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
    if (!res.ok) {
      setError(data.detail ?? data.error ?? "Save failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (opts.publish) {
      router.push("/games-admin/word-packs");
    } else {
      router.refresh();
    }
  }

  async function destroy() {
    if (!confirm("Delete this pack? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/games-admin/word-packs/${pack.id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      setError("Delete failed");
      return;
    }
    router.push("/games-admin/word-packs");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
            Word pack · {isLive ? "Live" : "Draft"}
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight">
            {title || "(untitled)"}
          </h1>
        </div>
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Difficulty (grid {gridSize}×{gridSize})
          </span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as WordSearchDifficulty)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          >
            <option value="easy">Easy (10×10)</option>
            <option value="medium">Medium (14×14)</option>
            <option value="hard">Hard (18×18)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Subtitle
          </span>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          <span>theme: {pack.payload.theme_slug}</span>
          {pack.payload.team_slug && <span>team: {pack.payload.team_slug}</span>}
          <span>created: {new Date(pack.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-lg">
            Words ({words.length})
          </h2>
          <button
            type="button"
            onClick={addWord}
            className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
          >
            + Add word
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {words.map((w, i) => (
            <li
              key={i}
              className={`grid grid-cols-[160px_1fr_auto] gap-3 items-start ${
                w.error ? "" : ""
              }`}
            >
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={w.word}
                  onChange={(e) => updateWord(i, { word: e.target.value, error: undefined })}
                  placeholder="DAMIAN"
                  className={`bg-[var(--color-warm-surface-2)] border rounded px-3 py-2 font-[family-name:var(--font-jetbrains)] text-sm uppercase text-[var(--color-bone)] focus:outline-none ${
                    w.error
                      ? "border-[var(--color-red-soft)] focus:border-[var(--color-red-soft)]"
                      : "border-[var(--color-line)] focus:border-[var(--color-red)]"
                  }`}
                />
                {w.error && (
                  <span className="text-[var(--color-red-soft)] text-[0.65rem] font-[family-name:var(--font-jetbrains)] uppercase tracking-wide">
                    {w.error}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={w.hint}
                onChange={(e) => updateWord(i, { hint: e.target.value })}
                placeholder="Clue / hint"
                className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
              />
              <button
                type="button"
                onClick={() => removeWord(i)}
                className="text-[var(--color-warm-mute)] hover:text-[var(--color-red-soft)] px-2"
                aria-label="Remove word"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="text-[var(--color-red-soft)] text-sm border border-[var(--color-red-soft)]/40 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
            Crossword grid
          </div>
          <div className="font-[family-name:var(--font-fraunces)] text-base leading-snug">
            {hasCrossword ? (
              <>
                <span className="text-[var(--color-green)]">●</span> Live · {pack.payload.crossword_grid!.placed.length} clues
              </>
            ) : (
              <span className="text-[var(--color-warm-mute)]">Not generated yet — click to make this pack playable on /games/crossword.</span>
            )}
          </div>
          {crosswordResult?.placed !== undefined && (
            <div className="text-[var(--color-green)] text-[0.7rem] mt-1">
              ✓ Placed {crosswordResult.placed} words
              {crosswordResult.dropped && crosswordResult.dropped.length > 0
                ? ` · ${crosswordResult.dropped.length} dropped (${crosswordResult.dropped.map((d) => d.word).join(", ")})`
                : ""}
            </div>
          )}
          {crosswordResult?.error && (
            <div className="text-[var(--color-red-soft)] text-[0.7rem] mt-1">
              ✗ {crosswordResult.error}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={generateCrossword}
          disabled={crosswordBusy || busy}
          className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-2.5 rounded-sm hover:border-[var(--color-bone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {crosswordBusy
            ? "Generating…"
            : hasCrossword
            ? "Regenerate grid"
            : "Generate crossword"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => save({ publish: true })}
          disabled={busy}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50"
        >
          {busy ? "Saving…" : isLive ? "Save & keep live" : "Verify & publish"}
        </button>
        <button
          type="button"
          onClick={() => save({ publish: false })}
          disabled={busy}
          className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={destroy}
          disabled={busy}
          className="ml-auto font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red-soft)] disabled:opacity-50"
        >
          Delete pack
        </button>
      </div>
    </div>
  );
}
