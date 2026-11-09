"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "This Week", href: "/runitback" },
  { label: "Results", href: "/runitback/results" },
  { label: "Standings", href: "/runitback/standings" },
  { label: "Leagues", href: "/runitback/leagues" },
] as const;

/** Pages that are not part of the weekly loop (invite landing, policies, pass). */
const HIDDEN = /^\/runitback\/(l(\/|$)|pass(\/|$)|privacy(\/|$)|terms(\/|$)|parents(\/|$)|support(\/|$))/;

export function activeTab(pathname: string): (typeof TABS)[number]["href"] | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/runitback" || p === "/runitback/play") return "/runitback";
  if (p === "/runitback/results" || /^\/runitback\/[^/]+\/week-\d+$/.test(p)) return "/runitback/results";
  if (p === "/runitback/standings" || p === "/runitback/archive") return "/runitback/standings";
  if (p === "/runitback/leagues" || p.startsWith("/runitback/leagues/")) return "/runitback/leagues";
  return null;
}

export default function SectionNav() {
  const pathname = usePathname();
  if (HIDDEN.test(pathname)) return null;
  const active = activeTab(pathname);
  return (
    <nav aria-label="Run It Back sections" className="border-b border-[var(--color-line)] px-4 min-[760px]:px-10">
      <ul className="mx-auto flex max-w-[1240px] flex-nowrap gap-x-6 overflow-x-auto whitespace-nowrap">
        {TABS.map((t) => {
          const on = t.href === active;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b ${
                  on ? "border-[var(--color-red)] text-[var(--color-red)]" : "border-transparent text-[var(--color-mute)] hover:text-[var(--color-bone)]"
                } font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em]`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
