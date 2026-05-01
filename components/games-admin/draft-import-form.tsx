"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TeamOption = { slug: string; label: string };

type Props = { teams: TeamOption[] };

type ValidationPreview =
  | { kind: "idle" }
  | { kind: "ok"; count: number }
  | { kind: "error"; errors: string[] };

export default function DraftImportForm({ teams }: Props) {
  const router = useRouter();
  const [teamSlug, setTeamSlug] = useState(teams[0]?.slug ?? "");
  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<ValidationPreview>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canImport = useMemo(
    () => preview.kind === "ok" && !!teamSlug && !busy,
    [preview, teamSlug, busy]
  );

  function validate() {
    setResult(null);
    setSubmitError(null);
    if (json.trim().length === 0) {
      setPreview({ kind: "error", errors: ["JSON is empty."] });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      setPreview({
        kind: "error",
        errors: [`JSON parse failed: ${err instanceof Error ? err.message : String(err)}`],
      });
      return;
    }
    if (!Array.isArray(parsed)) {
      setPreview({ kind: "error", errors: ["Top-level value must be an array."] });
      return;
    }
    // Light client-side check — server is source of truth
    const errs: string[] = [];
    parsed.forEach((p, i) => {
      if (!p || typeof p !== "object") errs.push(`[${i}] not an object`);
      else {
        const o = p as Record<string, unknown>;
        if (typeof o.name !== "string") errs.push(`[${i}] missing name`);
        if (!Array.isArray(o.search_aliases)) errs.push(`[${i}:${o.name}] aliases not array`);
        if (!o.team_stint) errs.push(`[${i}:${o.name}] missing team_stint`);
      }
    });
    if (errs.length > 0) {
      setPreview({ kind: "error", errors: errs });
      return;
    }
    setPreview({ kind: "ok", count: parsed.length });
  }

  async function importIt() {
    if (!canImport) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const parsed = JSON.parse(json);
      const res = await fetch("/api/games-admin/draft-players/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamSlug, players: parsed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (payload?.error === "validation_failed" && Array.isArray(payload.errors)) {
          setSubmitError(`Server rejected ${payload.errors.length} players. First: ${payload.errors[0]}`);
        } else {
          setSubmitError(payload?.error ?? "Import failed.");
        }
        return;
      }
      setResult({
        inserted: payload.inserted ?? 0,
        skipped: payload.skipped ?? 0,
        errors: payload.errors ?? [],
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          Team
        </span>
        <select
          value={teamSlug}
          onChange={(e) => setTeamSlug(e.target.value)}
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-3 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
        >
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          Player JSON array
        </span>
        <textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setPreview({ kind: "idle" });
            setResult(null);
            setSubmitError(null);
          }}
          rows={18}
          placeholder='[{"name":"Kobe Bryant", …}, …]'
          className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-4 font-[family-name:var(--font-jetbrains)] text-[0.78rem] text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] leading-relaxed resize-y"
        />
      </label>

      {preview.kind === "ok" && (
        <div className="px-4 py-3 rounded border border-[var(--color-green)] bg-[rgba(74,222,128,0.08)] font-[family-name:var(--font-fraunces)] italic text-[var(--color-green)]">
          ✓ JSON looks valid · {preview.count} players ready to import.
        </div>
      )}
      {preview.kind === "error" && (
        <div className="px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)]">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] mb-2">
            {preview.errors.length} validation error{preview.errors.length === 1 ? "" : "s"}
          </div>
          <ul className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] flex flex-col gap-1 max-h-[180px] overflow-y-auto">
            {preview.errors.slice(0, 30).map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
            {preview.errors.length > 30 && (
              <li className="italic text-[var(--color-warm-mute)]">…and {preview.errors.length - 30} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={validate}
          className="border border-[var(--color-line-strong)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          Validate JSON
        </button>
        <button
          type="button"
          onClick={importIt}
          disabled={!canImport}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </div>

      {submitError && (
        <div className="px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
          {submitError}
        </div>
      )}

      {result && (
        <div className="px-5 py-4 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)]">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
            Import result
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <ResultStat label="Inserted" value={result.inserted} color="var(--color-green)" />
            <ResultStat label="Skipped (duplicates)" value={result.skipped} color="var(--color-warm-mute)" />
            <ResultStat label="Errors" value={result.errors.length} color={result.errors.length ? "var(--color-red-soft)" : "var(--color-warm-mute)"} />
          </div>
          {result.errors.length > 0 && (
            <ul className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-mute)] flex flex-col gap-1 max-h-[160px] overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
          <a
            href={`/games-admin/draft-players/${teamSlug}`}
            className="mt-3 inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-red-soft)] transition-colors"
          >
            Review imported players →
          </a>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-0.5">
        {label}
      </div>
      <div
        className="font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
