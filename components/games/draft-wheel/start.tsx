"use client";

import { useState } from "react";

type Props = {
  onSubmit: (a: string, b: string) => Promise<void>;
  initialA?: string;
};

/**
 * Two-name entry screen at the start of a Draft Wheel game.
 */
export default function DraftWheelStart({ onSubmit, initialA = "" }: Props) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    a.trim().length > 0 &&
    b.trim().length > 0 &&
    a.trim().toLowerCase() !== b.trim().toLowerCase();

  async function go() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(a.trim(), b.trim());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Couldn't start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[640px] mx-auto px-6 pt-12 pb-20">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-6">
        Draft Wheel · 2 players · 5 rounds
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[0.95] tracking-[-0.02em] mb-3">
        Spin the team. <span className="italic font-normal text-[var(--color-red)]">Pick the spot.</span>
      </h1>
      <p className="text-[var(--color-mute)] text-[1rem] mb-10 leading-relaxed">
        The wheel hands each of you a random franchise every round. You pick the
        best player at <em>that</em> position from <em>your</em> team. Five rounds
        — G, G, F, F, C. AI judges. Each player gets one re-roll if the wheel
        lands ugly.
      </p>

      <div className="flex flex-col gap-5 mb-8">
        <NameField label="Player 1" value={a} onChange={setA} placeholder="e.g. Jaiye" />
        <NameField label="Player 2" value={b} onChange={setB} placeholder="e.g. Dad" />
      </div>

      {error && (
        <p className="mb-5 text-sm italic font-[family-name:var(--font-fraunces)] text-[var(--color-red-bright)]">
          {error}
        </p>
      )}
      {a && b && a.trim().toLowerCase() === b.trim().toLowerCase() && (
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
        {busy ? "Starting…" : "Spin the wheel →"}
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
