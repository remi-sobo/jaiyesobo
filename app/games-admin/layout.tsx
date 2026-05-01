import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Games Admin · Jaiye",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function GamesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/games-admin");

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] text-[var(--color-bone)]">
      <header className="px-6 lg:px-10 py-5 border-b border-[var(--color-line)] flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight"
          >
            Jaiye<span className="italic font-normal text-[var(--color-red)]">.</span>
          </Link>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            Games admin / Curator
          </span>
        </div>
        <nav className="flex gap-5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          <Link href="/games-admin/draft-players" className="hover:text-[var(--color-bone)] transition-colors">
            Draft players
          </Link>
          <Link href="/games-admin/draft-players/import" className="hover:text-[var(--color-bone)] transition-colors">
            Import
          </Link>
          <Link href="/admin" className="hover:text-[var(--color-bone)] transition-colors">
            ← Homeschool admin
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
