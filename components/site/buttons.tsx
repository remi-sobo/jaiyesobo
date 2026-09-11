import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The filled call to action. Red for the podcast, yellow for games.
 * The play glyph is a CSS triangle, not an icon asset.
 */
export function PlayButton({
  href,
  children,
  tone = "red",
  external = false,
}: {
  href: string;
  children: ReactNode;
  tone?: "red" | "yellow";
  external?: boolean;
}) {
  const bg = tone === "yellow" ? "var(--color-games-yellow)" : "var(--color-red)";
  const className =
    "group inline-flex min-h-12 items-center gap-3 px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors duration-300 hover:bg-[var(--color-bone)]";
  const inner = (
    <>
      <span
        aria-hidden
        className="h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--color-black)]"
      />
      {children}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} style={{ background: bg }}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={{ background: bg }}>
      {inner}
    </Link>
  );
}

/** The outlined companion button. Border goes red on hover. */
export function GhostButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] border border-[var(--color-line-strong)] transition-colors duration-300 hover:border-[var(--color-red)]"
    >
      {children}
    </Link>
  );
}
