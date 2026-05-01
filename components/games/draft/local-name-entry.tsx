"use client";

import { useState } from "react";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  onSubmit: (p1: string, p2: string) => Promise<void>;
  initialP1?: string;
};

export default function LocalNameEntry({ team, onSubmit, initialP1 = "" }: Props) {
  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = p1.trim().length > 0 && p2.trim().length > 0 && p1.trim().toLowerCase() !== p2.trim().toLowerCase();

  async function go() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(p1.trim(), p2.trim());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Couldn't start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[640px] mx-auto px-6 pt-12 pb-20">
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-6"
        style={{ color: team.primary_color }}
      >
        {team.abbreviation} · {team.city} {team.name}
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.02em] mb-3">
        Two players. <span className="italic font-normal text-[var(--color-red)]">One franchise.</span>
      </h1>
      <p className="text-[var(--color-mute)] text-[1rem] mb-10 leading-relaxed">
        Type your names, hit start. We&apos;ll flip a coin for who picks first.
        Five picks each. Pass the keyboard between turns.
      </p>

      <div className="flex flex-col gap-5 mb-8">
        <NameField label="Player 1" value={p1} onChange={setP1} placeholder="e.g. Jaiye" />
        <NameField label="Player 2" value={p2} onChange={setP2} placeholder="e.g. Dad" />
      </div>

      {error && (
        <p className="mb-5 text-sm italic font-[family-name:var(--font-fraunces)] text-[var(--color-red-bright)]">
          {error}
        </p>
      )}
      {p1 && p2 && p1.trim().toLowerCase() === p2.trim().toLowerCase() && (
        <p className="mb-5 text-sm italic font-[family-name:var(--font-fraunces)] text-[var(--color-mute)]">
          Different names, please.
        </p>
      )}

      <button
        type="button"
        onClick={go}
        disabled={!ready || busy}
        className="w-full sm:w-auto bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? "Starting…" : "Start the draft →"}
      </button>
    </div>
  );
}

function NameField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="bg-[var(--color-card)] border border-[var(--color-line)] rounded px-4 py-4 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] text-[1.1rem] focus:outline-none focus:border-[var(--color-games-yellow)]"
      />
    </label>
  );
}
