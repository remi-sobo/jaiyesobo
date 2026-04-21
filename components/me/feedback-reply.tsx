"use client";

import { useEffect } from "react";

type Props = { feedbackId: string; body: string; reply: string; repliedAt: string };

export default function FeedbackReply({ feedbackId, body, reply, repliedAt }: Props) {
  useEffect(() => {
    fetch(`/api/feedback/${feedbackId}/seen`, { method: "POST" }).catch(() => {});
  }, [feedbackId]);

  return (
    <div className="mt-8 px-7 py-6 rounded bg-gradient-to-br from-[var(--color-warm-surface-2)] to-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)]">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-2">
        Dad saw your note
      </div>
      <div className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] mb-3 text-[0.95rem] line-clamp-2">
        You said: &ldquo;{body}&rdquo;
      </div>
      <div className="font-[family-name:var(--font-fraunces)] italic text-[1.1rem] leading-snug text-[var(--color-warm-bone)]">
        {reply}
      </div>
      <div className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        {new Date(repliedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>
    </div>
  );
}
