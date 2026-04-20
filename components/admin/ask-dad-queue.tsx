"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Question } from "@/lib/admin-data";

type Props = { pending: Question[]; answered: Question[] };

export default function AskDadQueue({ pending, answered }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function reply(id: string) {
    const answer = drafts[id]?.trim();
    if (!answer) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/questions/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      setDrafts((d) => ({ ...d, [id]: "" }));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          Pending ({pending.length})
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-warm-mute)] italic">No questions waiting. Quiet is good.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((q) => (
              <div key={q.id} className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
                  {new Date(q.asked_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                <p className="font-[family-name:var(--font-fraunces)] italic text-xl leading-snug text-[var(--color-warm-bone)] mb-4">
                  &ldquo;{q.body}&rdquo;
                </p>
                <textarea
                  value={drafts[q.id] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                  placeholder="Reply to Jaiye…"
                  rows={2}
                  className="w-full bg-[var(--color-warm-surface-2)] border border-[var(--color-line-strong)] rounded p-3 text-sm text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] resize-y"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => reply(q.id)}
                    disabled={busy === q.id || !drafts[q.id]?.trim()}
                    className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-5 py-2.5 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 transition-colors"
                  >
                    {busy === q.id ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
          <span className="w-6 h-px bg-[var(--color-warm-mute)]" />
          Answered ({answered.length})
        </div>
        {answered.length === 0 ? (
          <p className="text-sm text-[var(--color-warm-mute)] italic">Nothing yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {answered.map((q) => (
              <div key={q.id} className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4 opacity-80">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] mb-1.5">
                  {new Date(q.asked_at).toLocaleString("en-US", { month: "short", day: "numeric" })}
                  {q.seen_at && " · seen"}
                </div>
                <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] mb-2">
                  &ldquo;{q.body}&rdquo;
                </p>
                {q.answer && (
                  <p className="text-sm text-[var(--color-bone)]">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-red)] mr-2">
                      You:
                    </span>
                    {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
