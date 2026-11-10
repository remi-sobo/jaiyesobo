"use client";

import { useState } from "react";

/** Copies this page's address so a reader can send the column to somebody. */
export default function CopyLink() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="border border-[var(--color-line-strong)] px-4 py-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-bone)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
