import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listWeeks } from "@/lib/sportsbook/data";
import { weekSlug } from "@/lib/sportsbook/weeks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Results · Run It Back Picks" };

/** The permanent home for results: sends you to the newest final week, else the newest graded one. */
export default async function ResultsPage() {
  let target: string | null = null;
  try {
    const weeks = (await listWeeks()).sort((a, b) => b.week_number - a.week_number);
    const w = weeks.find((x) => x.status === "final") ?? weeks.find((x) => x.status === "graded");
    if (w) target = `/runitback/${w.season}/${weekSlug(w.week_number)}`;
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.results", err: String(e) }));
  }
  if (target) redirect(target);
  return (
    <main className="px-5 py-[clamp(64px,10vw,140px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[640px] text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">Run It Back Picks · Results</div>
        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,6vw,3.4rem)] font-black leading-[0.95] tracking-[-0.03em]">
          No results yet. Week 1 is in the books on Monday.
        </h1>
        <Link
          href="/runitback"
          className="mt-8 inline-flex min-h-11 items-center border border-[var(--color-line-strong)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)]"
        >
          This week&apos;s picks →
        </Link>
      </div>
    </main>
  );
}
