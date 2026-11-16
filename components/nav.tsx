"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// Two things live here: what Jaiye says (On The Court) and what he made (Play).
// History and Now are still pages, they just aren't in the menu.
const links = [
  { href: "/on-the-court", label: "On The Court" },
  { href: "/games", label: "Play" },
  { href: "/predictions", label: "Predictions" },
  { href: "/about", label: "About" },
];

/** The main game gets the one button in the bar. */
const mainGame = { href: "/runitback", label: "Play Run It Back" };

export default function Nav() {
  const [open, setOpen] = useState(false);

  // Escape closes the drawer, and the page behind it doesn't scroll while
  // it's open. The 760px breakpoint is a Tailwind query below, not a JS
  // width listener, so there's nothing to measure here.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <nav className="sticky top-0 z-[100] border-b border-[var(--color-line)] bg-[rgba(10,10,10,0.94)] backdrop-blur-[10px]">
      <div className="flex items-center justify-between px-5 py-4 min-[760px]:px-10">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-[family-name:var(--font-fraunces)] text-xl font-black tracking-tight text-[var(--color-bone)]"
        >
          JS<span className="text-[var(--color-red)]">.</span>
        </Link>

        {/* Desktop: one line, never two. */}
        <ul className="hidden list-none items-center gap-7 min-[760px]:flex lg:gap-9">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group relative inline-block py-1 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] whitespace-nowrap text-[var(--color-bone)]"
              >
                {l.label}
                <span className="absolute bottom-0 left-0 h-px w-0 bg-[var(--color-red)] transition-[width] duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={mainGame.href}
              className="inline-flex min-h-9 items-center bg-[var(--color-red)] px-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] font-bold uppercase tracking-[0.15em] whitespace-nowrap text-[var(--color-black)] transition-colors duration-300 hover:bg-[var(--color-red-bright)]"
            >
              {mainGame.label}
            </Link>
          </li>
        </ul>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-drawer"
          onClick={() => setOpen((v) => !v)}
          className="-mr-3 flex h-12 w-12 items-center justify-end min-[760px]:hidden"
        >
          <span className="flex w-5 flex-col items-start gap-[5px]">
            <span className="block h-px w-5 bg-[var(--color-bone)]" />
            <span className="block h-px w-5 bg-[var(--color-bone)]" />
            <span className="block h-px w-[13px] bg-[var(--color-red)]" />
          </span>
        </button>
      </div>

      {/* Mobile drawer, inside the nav so it sits under the hairline. */}
      {open && (
        <div
          id="site-drawer"
          className="motion-safe:animate-[drawer-in_0.28s_cubic-bezier(0.2,0.8,0.2,1)_both] border-t border-[var(--color-line)] min-[760px]:hidden"
        >
          <ul className="list-none">
            {links.map((l, i) => (
              <li key={l.href} className="border-b border-[var(--color-line)]">
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between px-5 py-3 font-[family-name:var(--font-fraunces)] text-[2rem] font-black leading-none tracking-[-0.03em] text-[var(--color-bone)]"
                >
                  {l.label}
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-normal tracking-[0.2em] text-[var(--color-mute)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 pt-5">
            <Link
              href={mainGame.href}
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center justify-center bg-[var(--color-red)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.8rem] font-bold uppercase tracking-[0.15em] text-[var(--color-black)]"
            >
              {mainGame.label}
            </Link>
          </div>
          <div className="px-5 py-5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
            Vol. 02 · 2026
          </div>
        </div>
      )}
    </nav>
  );
}
