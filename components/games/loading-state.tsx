"use client";

import { useEffect, useState } from "react";

const PHASES = [
  "Reading your list…",
  "Thinking about it…",
  "Pulling up the receipts…",
  "Checking the tape…",
  "Almost there…",
];

export default function LoadingState({ message }: { message?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (message) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHASES.length), 1600);
    return () => clearInterval(t);
  }, [message]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex gap-2 mb-6" aria-hidden>
        <span className="w-2 h-2 rounded-full bg-[var(--color-games-yellow)] animate-pulse" />
        <span
          className="w-2 h-2 rounded-full bg-[var(--color-red)] animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[var(--color-games-green)] animate-pulse"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      <div
        className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-bone)] text-xl leading-snug max-w-[40ch]"
        aria-live="polite"
      >
        {message ?? PHASES[i]}
      </div>
    </div>
  );
}
