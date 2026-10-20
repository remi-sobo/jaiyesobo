"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Posts an admin action, refreshes the page on success, keeps the error for display. */
export function useSbAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, payload: Record<string, unknown> = {}, key = action): Promise<Record<string, unknown> | null> {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/sportsbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong.");
        return null;
      }
      router.refresh();
      return json;
    } catch {
      setError("Couldn't reach the server.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return { run, busy, error, setError };
}
