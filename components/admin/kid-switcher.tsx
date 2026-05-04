"use client";

import { useState } from "react";
import type { Kid } from "@/lib/admin-context";

type Props = {
  kids: Kid[];
  activeKidId: string;
};

/**
 * Pill-row switcher rendered at the top of every admin page.
 * Active pill in the kid's accent color (red for Jaiye, kemi-pink for Kemi).
 *
 * Switching POSTs to /api/admin/active-kid (sets the active_kid_id cookie)
 * then hard-reloads. Hard reload (not router.refresh) is intentional: it
 * guarantees the new Set-Cookie has been committed before any server
 * component re-renders, eliminating the race where ~half the time the
 * layout re-fetches against the old cookie.
 */
export default function KidSwitcher({ kids, activeKidId }: Props) {
  const [pending, setPending] = useState(false);

  async function selectKid(kidId: string) {
    if (kidId === activeKidId || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/active-kid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kid_id: kidId }),
      });
      if (!res.ok) {
        setPending(false);
        return;
      }
      window.location.reload();
    } catch {
      setPending(false);
    }
  }

  return (
    <div
      className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em]"
      role="group"
      aria-label="Active kid"
    >
      {kids.map((k) => {
        const active = k.id === activeKidId;
        const accent = accentForKid(k.display_name);
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => selectKid(k.id)}
            disabled={pending}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-50 ${
              active
                ? "text-[var(--color-bone)] border-transparent"
                : "text-[var(--color-warm-mute)] border-[var(--color-line)] hover:text-[var(--color-bone)]"
            }`}
            style={
              active
                ? { backgroundColor: accent.bg, borderColor: accent.bg }
                : undefined
            }
          >
            {k.display_name}
          </button>
        );
      })}
    </div>
  );
}

function accentForKid(name: string): { bg: string } {
  const n = name.toLowerCase();
  if (n === "kemi") return { bg: "#C83C78" };
  // Jaiye / default — use the existing red token (resolved at runtime via CSS var).
  return { bg: "var(--color-red)" };
}
