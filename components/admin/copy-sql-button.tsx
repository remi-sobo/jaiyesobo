"use client";

import { useState } from "react";

type Props = { favorites: string[] };

export default function CopySqlButton({ favorites }: Props) {
  const [copied, setCopied] = useState(false);

  const sql = buildSql(favorites);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <pre className="bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded p-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-bone)] overflow-x-auto leading-relaxed whitespace-pre">
        {sql}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="self-end bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        {copied ? "Copied ✓" : "Copy SQL"}
      </button>
    </div>
  );
}

function escapeSqlString(s: string): string {
  // Escape single quotes for SQL string literals
  return s.replace(/'/g, "''");
}

function buildSql(favorites: string[]): string {
  if (favorites.length === 0) return "-- No favorites starred yet.";
  const rows = favorites.map((f) => {
    const json = JSON.stringify({ prompt: f, tags: [] });
    return `  ('top-five', 'top_five_prompt', '${escapeSqlString(json)}', 'live', true)`;
  });
  return `insert into game_content (game_slug, content_type, payload, status, created_by_curator) values\n${rows.join(",\n")};`;
}
