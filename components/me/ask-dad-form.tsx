"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AskDadForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"writing" | "sending" | "sent" | "error">("writing");

  async function send() {
    if (text.trim().length === 0 || phase === "sending") return;
    setPhase("sending");
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      if (!res.ok) throw new Error("send failed");
      setPhase("sent");
    } catch (err) {
      console.error(err);
      setPhase("error");
    }
  }

  if (phase === "sent") {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.12)]">
          <span className="w-8 h-5 border-l-[3px] border-b-[3px] border-[var(--color-bone)] rotate-[-45deg] translate-x-[3px] translate-y-[-3px]" />
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-4xl leading-none tracking-[-0.03em] mb-3">
          Sent to <span className="italic font-normal text-[var(--color-red)]">Dad.</span>
        </h1>
        <p className="text-[var(--color-warm-mute)] mb-8 font-[family-name:var(--font-fraunces)] text-lg">
          He&apos;ll get back to you when he can.
        </p>
        <button
          type="button"
          onClick={() => {
            router.push("/me");
            router.refresh();
          }}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
        >
          Back to Today
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-10 pb-6 border-b border-[var(--color-line)]">
        <Link
          href="/me"
          className="flex items-center gap-2 text-[var(--color-warm-mute)] hover:text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] transition-colors"
        >
          <span>←</span> Back to Today
        </Link>
      </div>

      <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-4xl tracking-[-0.02em] mb-3">
        Ask <span className="italic font-normal text-[var(--color-red)]">Dad.</span>
      </h1>
      <p className="text-[var(--color-warm-mute)] mb-8 max-w-[48ch] leading-relaxed">
        Write your question. Dad will read it when he&apos;s free and get back to you. Don&apos;t interrupt him.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you want to ask?"
        maxLength={500}
        rows={5}
        className="w-full bg-[var(--color-warm-surface)] border border-[var(--color-line-strong)] rounded p-5 text-lg leading-relaxed text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)]"
      />

      <div className="flex justify-between items-center mt-4">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
          {text.length} / 500
        </div>
        <button
          type="button"
          onClick={send}
          disabled={phase === "sending" || text.trim().length === 0}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-7 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === "sending" ? "Sending…" : "Send to Dad"}
        </button>
      </div>

      {phase === "error" && (
        <p className="mt-4 text-sm text-[var(--color-red-soft)] italic">Something went wrong. Try again.</p>
      )}
    </>
  );
}
