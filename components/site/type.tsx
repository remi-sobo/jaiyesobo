import type { ReactNode } from "react";

/**
 * Renders a headline with one phrase set in italic red, which is the single
 * typographic accent the whole site runs on. If the phrase isn't found the
 * headline still renders, just without the accent.
 */
export function Accent({ text, accent }: { text: string; accent?: string }) {
  if (!accent) return <>{text}</>;
  const at = text.indexOf(accent);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <em className="font-normal italic text-[var(--color-red)]">{accent}</em>
      {text.slice(at + accent.length)}
    </>
  );
}

/** The mono section label: a 32px hairline rule, then uppercase mono text. */
export function SectionLabel({
  children,
  tone = "mute",
}: {
  children: ReactNode;
  tone?: "mute" | "red" | "yellow";
}) {
  const color =
    tone === "red"
      ? "var(--color-red)"
      : tone === "yellow"
        ? "var(--color-games-yellow)"
        : "var(--color-mute)";
  return (
    <div
      className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em]"
      style={{ color }}
    >
      <span className="h-px w-8 shrink-0" style={{ background: color }} />
      {children}
    </div>
  );
}

/** A handwritten margin note. Budget is one or two per page, no more. */
export function HandNote({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <p
      className={`font-[family-name:var(--font-caveat)] text-[1.5rem] leading-tight text-[var(--color-mute)] ${
        align === "right" ? "self-end text-right" : ""
      } ${className}`}
      style={{ transform: `rotate(${align === "right" ? -1.2 : -1.5}deg)` }}
    >
      {children}
    </p>
  );
}

/** The small outlined pill used for podcast segments and chapter tags. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-[var(--color-line-strong)] px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
      {children}
    </span>
  );
}
