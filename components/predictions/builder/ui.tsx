import type { ReactNode } from "react";
import { Accent } from "@/components/site/type";

/** Step title plus one plain sentence of help. */
export function StepIntro({ title, accent, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,5vw,3rem)] font-black leading-[0.95] tracking-[-0.035em]">
        <Accent text={title} accent={accent} />
      </h1>
      <p className="mt-3 max-w-[60ch] text-[0.98rem] leading-relaxed text-[var(--color-warm-mute)]">{children}</p>
    </div>
  );
}

export function MonoLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] ${className}`}
    >
      {children}
    </div>
  );
}
