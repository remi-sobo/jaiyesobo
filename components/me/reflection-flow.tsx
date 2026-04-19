"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TaskLite = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  reflection_prompt: string | null;
};

type Props = {
  task: TaskLite;
  streak: number;
};

type Phase = "writing" | "sending" | "success" | "error";

const DEFAULT_PROMPT = "What did you work on? What was hard? What did you learn?";

export default function ReflectionFlow({ task, streak }: Props) {
  const router = useRouter();
  const prompt = task.reflection_prompt || DEFAULT_PROMPT;

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("writing");

  const canSend = text.trim().length > 0 && phase !== "sending";

  async function send() {
    if (!canSend) return;
    setPhase("sending");
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, reflection: text.trim() }),
      });
      if (!res.ok) throw new Error(`reflect failed: ${res.status}`);
      setPhase("success");
    } catch (err) {
      console.error(err);
      setPhase("error");
    }
  }

  function goHome() {
    router.push("/me");
    router.refresh();
  }

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-10 pb-6 border-b border-[var(--color-line)]">
        <Link
          href="/me"
          className="flex items-center gap-2 text-[var(--color-warm-mute)] hover:text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] transition-colors"
        >
          <span>←</span> Back to Today
        </Link>
        <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] animate-pulse" />
          Reflect
        </div>
      </div>

      <div
        className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded px-8 py-7 mb-8"
        style={{ borderLeftColor: "var(--color-amber)", borderLeftWidth: "4px" }}
      >
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-amber)] mb-3">
          {task.subject || "Task"} · reflection for Dad
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em] mb-2">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-[var(--color-warm-bone)] leading-relaxed max-w-[60ch]">{task.description}</p>
        )}
      </div>

      {phase !== "success" ? (
        <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md p-8">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-amber)] mb-3">
            The prompt
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-2xl leading-snug text-[var(--color-warm-bone)] mb-8 max-w-[52ch]">
            {prompt}
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={phase === "sending"}
            placeholder="Start here. One sentence at a time."
            rows={8}
            className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-5 font-[family-name:var(--font-fraunces)] italic text-[1.15rem] leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] focus:outline-none focus:border-[var(--color-amber)]"
          />

          <div className="flex justify-between items-center mt-4">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
              {encouragement(text)}
            </div>
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {phase === "sending" ? (
                <><Spinner /> Sending...</>
              ) : (
                <>Send to Dad <span>→</span></>
              )}
            </button>
          </div>

          {phase === "error" && (
            <div className="mt-4 px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm font-[family-name:var(--font-fraunces)] italic">
              Something went wrong. Try again, or ask Dad.
            </div>
          )}
        </div>
      ) : (
        <div className="relative bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md px-10 py-16 text-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none [background:radial-gradient(circle,rgba(230,57,70,0.12),transparent_60%)]" />
          <div className="w-24 h-24 mx-auto mb-8 relative z-[2] rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.12),0_20px_40px_-10px_rgba(230,57,70,0.3)]">
            <span className="w-9 h-5 border-l-[3px] border-b-[3px] border-[var(--color-bone)] rotate-[-45deg] translate-x-[3px] translate-y-[-4px]" />
          </div>
          <h1 className="relative z-[2] font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] mb-4">
            Sent to <span className="italic font-normal text-[var(--color-red)]">Dad.</span>
          </h1>
          <p className="relative z-[2] font-[family-name:var(--font-fraunces)] text-[1.2rem] leading-relaxed text-[var(--color-warm-bone)] max-w-[44ch] mx-auto mb-10">
            Your reflection is in. <em className="italic text-[var(--color-red)]">Honest words matter.</em>
          </p>
          <div className="relative z-[2] inline-flex justify-center gap-10 px-8 py-6 bg-[var(--color-warm-surface-2)] rounded mb-10">
            <div className="flex flex-col items-center">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
                Streak
              </div>
              <div className="font-[family-name:var(--font-fraunces)] font-black text-3xl tracking-tight">
                <span className="italic font-normal text-[var(--color-red)] mr-1">★</span>
                {streak}
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-warm-mute)] mt-1">
                days
              </div>
            </div>
          </div>
          <div className="relative z-[2]">
            <button
              type="button"
              onClick={goHome}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
            >
              Back to Today
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function encouragement(text: string): string {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "Start with one sentence.";
  if (sentences === 1) return "1 sentence. Keep going.";
  if (sentences < 4) return `${sentences} sentences so far. Keep going.`;
  return `${sentences} sentences. Nice.`;
}
