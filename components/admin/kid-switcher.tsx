"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Kid } from "@/lib/admin-context";

type Props = {
  kids: Kid[];
  activeKidId: string;
};

/**
 * Pill-row switcher rendered at the top of every admin page.
 * Active pill in the kid's accent color (red for Jaiye, kemi-pink for Kemi).
 *
 * Switching POSTs to /api/admin/active-kid which sets the cookie, then
 * router.refresh() reloads server data with the new active-kid context.
 */
export default function KidSwitcher({ kids, activeKidId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectKid(kidId: string) {
    if (kidId === activeKidId) return;
    startTransition(async () => {
      await fetch("/api/admin/active-kid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kid_id: kidId }),
      });
      router.refresh();
    });
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
