"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "/ball", label: "Ball" },
  { href: "/build", label: "Build" },
  { href: "/pod", label: "Pod" },
  { href: "/read", label: "Read" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  // Close on Esc + lock body scroll while the mobile sheet is open.
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
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] px-5 sm:px-10 py-5 sm:py-6 flex justify-between items-center ${
          open ? "" : "mix-blend-difference"
        }`}
      >
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight text-[var(--color-bone)]"
          onClick={() => setOpen(false)}
        >
          JS<span className="text-[var(--color-red)]">.</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-6 lg:gap-8 list-none font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em]">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-[var(--color-bone)] py-1 relative group"
              >
                {l.label}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-[var(--color-red)] transition-[width] duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger / close */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex flex-col gap-[5px] p-2 -mr-2 text-[var(--color-bone)]"
        >
          <span
            className={`block w-6 h-px bg-current transition-transform duration-300 ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-6 h-px bg-current transition-opacity duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block w-6 h-px bg-current transition-transform duration-300 ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu sheet */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 z-[90] md:hidden bg-[var(--color-black)] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <ul className="h-full flex flex-col justify-center items-start gap-2 px-8 list-none font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,10vw,4.5rem)] leading-[1.05] tracking-[-0.02em]">
          {links.map((l, i) => (
            <li
              key={l.href}
              className={`transition-[opacity,transform] duration-500 ${
                open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              }`}
              style={{ transitionDelay: open ? `${80 + i * 40}ms` : "0ms" }}
            >
              <Link
                href={l.href}
                className="text-[var(--color-bone)] hover:text-[var(--color-red)] transition-colors"
                onClick={() => setOpen(false)}
              >
                {l.label}
                <span className="text-[var(--color-red)] italic font-normal">.</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="absolute bottom-8 left-8 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">
          Jaiye Sobo · East Palo Alto
        </div>
      </div>
    </>
  );
}
