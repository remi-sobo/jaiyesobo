"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { taskId: string; done: boolean };

export default function CheckToggle({ taskId, done }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (done || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={done || busy}
      aria-label={done ? "Completed" : "Mark complete"}
      className={`rounded-full border-[1.5px] flex items-center justify-center shrink-0 w-[26px] h-[26px] transition-colors ${
        done
          ? "bg-[var(--color-red)] border-[var(--color-red)] cursor-default"
          : busy
          ? "border-[var(--color-red)] opacity-60"
          : "border-[var(--color-line-strong)] hover:border-[var(--color-red)] cursor-pointer"
      }`}
    >
      {done && (
        <span className="block w-[10px] h-[6px] border-l-[1.5px] border-b-[1.5px] border-[var(--color-bone)] -translate-y-[1px] -rotate-45" />
      )}
    </button>
  );
}
