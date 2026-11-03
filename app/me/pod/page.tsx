import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, getKidSession } from "@/lib/session";
import { getHousePlayers } from "@/lib/sportsbook/players";
import { buildPodPrep } from "@/lib/sportsbook/pod";
import { getPodNotes } from "@/lib/sportsbook/pod-notes";
import { loadWeekView } from "@/lib/sportsbook/view";
import { SB_SEASON, currentWeekNumber } from "@/lib/sportsbook/weeks";
import PodPrep from "@/components/me/pod-prep";
import BottomNav from "@/components/me/bottom-nav";

export const metadata: Metadata = {
  title: "Jaiye · On The Court",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ week?: string }> };

export default async function PodPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const n = Math.min(40, Math.max(1, Math.floor(Number(week)) || currentWeekNumber()));
  const session = (await getKidSession()) ?? (await getAdminSession());
  if (!session) redirect(`/me/lock?next=${encodeURIComponent(week ? `/me/pod?week=${n}` : "/me/pod")}`);

  const [thisWeek, lastWeek, house, notes] = await Promise.all([
    loadWeekView(n, { admin: true }).catch(() => null),
    n > 1 ? loadWeekView(n - 1, { admin: true }).catch(() => null) : Promise.resolve(null),
    getHousePlayers(),
    getPodNotes(SB_SEASON, n).catch(() => ({}) as Record<string, string>),
  ]);
  const sections = buildPodPrep({ week: n, thisWeek, lastWeek, house });

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
      <header className="mb-10 pb-8 border-b border-[var(--color-line)]">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />
          <span>On The Court</span>
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
          Week {n} <span className="italic font-normal text-[var(--color-red)]">prep.</span>
        </h1>
        <div className="mt-5 flex items-center gap-3">
          <Link
            href={`/me/pod?week=${Math.max(1, n - 1)}`}
            aria-label="Previous week"
            className="flex h-11 w-11 items-center justify-center border border-[var(--color-line-strong)] rounded-sm"
          >
            ‹
          </Link>
          <Link
            href={`/me/pod?week=${Math.min(40, n + 1)}`}
            aria-label="Next week"
            className="flex h-11 w-11 items-center justify-center border border-[var(--color-line-strong)] rounded-sm"
          >
            ›
          </Link>
          {n !== currentWeekNumber() ? (
            <Link
              href="/me/pod"
              className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-red)]"
            >
              This week
            </Link>
          ) : null}
        </div>
      </header>
      <PodPrep week={n} sections={sections} notes={notes} />
      <BottomNav />
    </main>
  );
}
