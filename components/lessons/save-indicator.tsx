"use client";

import type { SaveStatus } from "./draft-context";

export default function SaveIndicator({
  status,
  savedAt,
  className,
}: {
  status: SaveStatus;
  savedAt: Date | null;
  className?: string;
}) {
  let label = "";
  if (status === "saving") label = "Saving…";
  else if (status === "error") label = "Couldn't save — keep typing";
  else if (status === "saved" && savedAt) label = `Saved · ${relativeTime(savedAt)}`;
  else if (status === "saved") label = "Saved";

  return (
    <span
      className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] ${
        status === "error"
          ? "text-[var(--color-red-soft)]"
          : status === "saving"
          ? "text-[var(--color-warm-mute)]"
          : "text-[var(--color-warm-dim)]"
      } ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

function relativeTime(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
