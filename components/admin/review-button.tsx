"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { completionId: string; reviewed: boolean };

export default function ReviewButton({ completionId, reviewed }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (reviewed) {
    return (
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        Reviewed ✓
      </span>
    );
  }

  async function mark() {
    setBusy(true);
    try {
      await fetch(`/api/admin/uploads/${completionId}/review`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={mark}
      disabled={busy}
      className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-red)] hover:border-[var(--color-red)] transition-colors disabled:opacity-40"
    >
      {busy ? "…" : "Mark reviewed"}
    </button>
  );
}
