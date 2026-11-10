import Link from "next/link";
import type { SbWeek } from "@/lib/sportsbook/types";
import type { ArchiveView } from "@/lib/sportsbook/view";
import { weekSlug } from "@/lib/sportsbook/weeks";
import { SeasonStandings } from "./public-week";

const mono = "font-[family-name:var(--font-jetbrains)]";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 ${mono} text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>
      <span className="h-px w-8 bg-[var(--color-red)]" />
      {children}
    </div>
  );
}

/** One chip per published week, linking to that week's results. */
export function PastWeeks({ weeks, current }: { weeks: Pick<SbWeek, "id" | "season" | "week_number">[]; current?: number }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {weeks.map((w) => (
        <li key={w.id}>
          <Link
            href={`/runitback/${w.season}/${weekSlug(w.week_number)}`}
            className={`inline-flex min-h-11 items-center border px-3 ${mono} text-[0.7rem] uppercase tracking-[0.15em] hover:border-[var(--color-red)] ${
              w.week_number === current ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
            }`}
          >
            Week {w.week_number}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Standings({ view }: { view: ArchiveView }) {
  const { summary, weeks } = view;
  const h = summary.jaiyeVsRemi;
  const record = h.jaiye + h.remi + h.ties > 0 ? `Jaiye ${h.jaiye} · Remi ${h.remi}${h.ties ? ` · ${h.ties} tied` : ""} (weeks won)` : null;
  const published = weeks.map((w) => w.week);
  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1240px]">
        <header className="border-b border-[var(--color-line-strong)] pb-8">
          <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back Picks · Season 2026-27</div>
          <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,8vw,5rem)] font-black leading-[0.9] tracking-[-0.04em]">Standings</h1>
          {record ? <p className={`mt-4 ${mono} text-[0.75rem] uppercase tracking-[0.2em] tabular-nums text-[var(--color-bone)]`}>{record}</p> : null}
        </header>

        <section className="mt-[clamp(32px,5vw,56px)]">
          <Label>Who&apos;s winning the season</Label>
          <div className="mt-5">
            <SeasonStandings summary={summary} />
          </div>
        </section>

        <section className="mt-[clamp(48px,7vw,88px)]">
          <Label>{published.length > 1 ? "Past weeks" : "Season archive"}</Label>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <PastWeeks weeks={published} />
            <Link
              href="/runitback/archive"
              className={`inline-flex min-h-11 items-center justify-center bg-[var(--color-red)] px-4 ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]`}
            >
              {published.length > 1 ? "Week by week →" : "See every week →"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function StandingsEmpty() {
  return (
    <main className="px-5 py-[clamp(64px,10vw,140px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[640px] text-center">
        <div className={`${mono} text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>Run It Back Picks · Standings</div>
        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,6vw,3.4rem)] font-black leading-[0.95] tracking-[-0.03em]">
          The season table starts once Week 1 is final.
        </h1>
        <Link
          href="/runitback"
          className={`mt-8 inline-flex min-h-11 items-center border border-[var(--color-line-strong)] px-5 ${mono} text-[0.72rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)]`}
        >
          This week&apos;s picks →
        </Link>
      </div>
    </main>
  );
}
