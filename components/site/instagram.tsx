import type { ReactNode } from "react";
import { instagram } from "@/lib/content/social";

/** The outlined button that sends people to the podcast's Instagram. */
export function InstagramButton({ children }: { children?: ReactNode }) {
  return (
    <a
      href={instagram.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 items-center px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] border border-[var(--color-line-strong)] transition-colors duration-300 hover:border-[var(--color-red)]"
    >
      {children ?? `Follow ${instagram.handle}`} ↗
    </a>
  );
}

/** A quiet one-line mention: some words, then the handle as the link. */
export function InstagramLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase leading-relaxed tracking-[0.2em] text-[var(--color-mute)] ${className}`}>
      {children}{" "}
      <a
        href={instagram.url}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--color-red)] transition-colors duration-300 hover:text-[var(--color-bone)]"
      >
        {instagram.handle} ↗
      </a>
    </p>
  );
}
