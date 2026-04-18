"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  length: 4 | 6;
  endpoint: string;
  successRedirect: string;
  label: string;
};

export default function PinPad({ length, endpoint, successRedirect, label }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setPin("");
    setStatus("idle");
    inFlight.current = false;
  }, []);

  useEffect(() => {
    if (pin.length !== length || inFlight.current) return;
    inFlight.current = true;
    setStatus("submitting");
    (async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (!res.ok) {
          setStatus("error");
          setTimeout(reset, 650);
          return;
        }
        router.replace(successRedirect);
        router.refresh();
      } catch {
        setStatus("error");
        setTimeout(reset, 650);
      }
    })();
  }, [pin, length, endpoint, successRedirect, router, reset]);

  const push = useCallback(
    (d: string) => {
      if (inFlight.current || status === "submitting") return;
      setPin((p) => (p.length >= length ? p : p + d));
    },
    [length, status]
  );

  const back = useCallback(() => {
    if (inFlight.current) return;
    setPin((p) => p.slice(0, -1));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") push(e.key);
      else if (e.key === "Backspace") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [push, back]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div
      className="w-full max-w-[320px] mx-auto"
      style={status === "error" ? { animation: "pin-shake 0.55s" } : undefined}
    >
      <div className="flex flex-col items-center gap-3 mb-12">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] animate-pulse" />
        <div className="font-[family-name:var(--font-fraunces)] font-black text-3xl tracking-tight">
          Jaiye<span className="italic font-normal text-[var(--color-red)]">.</span>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)]">
          {label}
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-12" aria-label={`PIN: ${pin.length} of ${length} digits entered`}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < pin.length;
          return (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                status === "error"
                  ? "bg-[var(--color-red)] border-[var(--color-red)]"
                  : filled
                  ? "bg-[var(--color-bone)] border-[var(--color-bone)]"
                  : "bg-transparent border-[var(--color-line-strong)]"
              }`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => push(d)}
            className="h-16 rounded-md border border-[var(--color-line)] bg-[var(--color-warm-surface)] hover:bg-[var(--color-warm-surface-2)] active:bg-[var(--color-warm-surface-3)] transition-colors font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight text-[var(--color-bone)]"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => push("0")}
          className="h-16 rounded-md border border-[var(--color-line)] bg-[var(--color-warm-surface)] hover:bg-[var(--color-warm-surface-2)] active:bg-[var(--color-warm-surface-3)] transition-colors font-[family-name:var(--font-fraunces)] font-black text-2xl tracking-tight text-[var(--color-bone)]"
        >
          0
        </button>
        <button
          type="button"
          onClick={back}
          aria-label="Delete last digit"
          className="h-16 rounded-md border border-transparent bg-transparent hover:border-[var(--color-line)] transition-colors font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
