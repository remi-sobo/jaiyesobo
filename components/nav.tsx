"use client";
import Link from "next/link";

const links = [
  { href: "/ball", label: "Ball" },
  { href: "/build", label: "Build" },
  { href: "/pod", label: "Pod" },
  { href: "/read", label: "Read" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-10 py-6 flex justify-between items-center mix-blend-difference">
      <Link href="/" className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight text-[var(--color-bone)]">
        JS<span className="text-[var(--color-red)]">.</span>
      </Link>
      <ul className="flex gap-8 list-none font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[var(--color-bone)] py-1 relative group">
              {l.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-[var(--color-red)] transition-[width] duration-300 group-hover:w-full" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
