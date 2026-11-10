import Link from "next/link";
import { SB_SEASON, weekSlug } from "@/lib/sportsbook/weeks";

/**
 * Last week's result, for the top of /runitback and the home-page panel.
 * Monday is the transition day: a visitor who lands for the new week should
 * immediately see who won the week that just closed and where they would have
 * finished. The caller passes the latest final week (see `lastWeekRow` in
 * lib/sportsbook/view.ts); when `last` is null, nothing renders.
 */
export type LastWeekRow = {
  week: number;
  /** `graded` while the week is still being checked; absent means final. */
  status?: "graded" | "final";
  jaiye: number;
  remi: number;
  /** Display name of the winner, or null for a tie. */
  winnerName: string | null;
  /** The winner's points (the top score when the week was a tie). */
  winnerPoints: number;
  /** Top 5 of that week's board, house players included. */
  top: Array<{ name: string; points: number }>;
  /** How many challengers finished above each of them. */
  beat: { jaiye: number; remi: number };
  /** The open week to send people to, or null when none is open. */
  nextWeek: number | null;
  /** The signed-in player's own line. Absent when nobody is signed in, null when they sat the week out. */
  me?: { rank: number; points: number; vsJaiye: number; vsRemi: number } | null;
};

type Props = {
  last: LastWeekRow | null;
  className?: string;
  /** `banner` for the top of /runitback, `compact` for the home-page panel, `line` for one line above the picks. */
  variant?: "banner" | "compact" | "line";
  /** `results` is the card at the top of a week's own results page: its CTA goes to this week's picks and it has no link to itself. */
  on?: "results";
};

const mono = "font-[family-name:var(--font-jetbrains)]";
const serif = "font-[family-name:var(--font-fraunces)]";

const isHouse = (name: string) => /^(jaiye|remi)$/i.test(name);

function beatLine(beat: LastWeekRow["beat"]): string {
  const who = (n: number, name: string) => `${n} ${n === 1 ? "person" : "people"} beat ${name}`;
  if (beat.jaiye === 0 && beat.remi === 0) return "Nobody beat Jaiye or Remi.";
  if (beat.jaiye === 0) return `Nobody beat Jaiye, ${beat.remi} beat Remi.`;
  if (beat.remi === 0) return `${who(beat.jaiye, "Jaiye")}, nobody beat Remi.`;
  return `${who(beat.jaiye, "Jaiye")}, ${beat.remi} beat Remi.`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "You finished 4th with 1 point. You beat Remi by 15 and Jaiye beat you by 1." */
export function meLine(me: NonNullable<LastWeekRow["me"]>): string {
  const pts = `${me.points} ${me.points === 1 ? "point" : "points"}`;
  const vs = [
    { name: "Jaiye", d: me.vsJaiye },
    { name: "Remi", d: me.vsRemi },
  ];
  const beat = vs.filter((v) => v.d > 0);
  const tied = vs.filter((v) => v.d === 0);
  const lost = vs.filter((v) => v.d < 0);
  if (me.rank === 1 && beat.length === 2) return "You won the week.";
  const parts: string[] = [];
  if (beat.length === 2 && beat[0].d === beat[1].d) parts.push(`You beat Jaiye and Remi by ${beat[0].d}`);
  else if (beat.length) parts.push(`You beat ${beat.map((v) => `${v.name} by ${v.d}`).join(" and ")}`);
  if (tied.length) parts.push(`You tied ${tied.map((v) => v.name).join(" and ")}`);
  if (lost.length === 2 && lost[0].d === lost[1].d) parts.push(`Jaiye and Remi beat you by ${-lost[0].d}`);
  else if (lost.length) parts.push(lost.map((v) => `${v.name} beat you by ${-v.d}`).join(" and "));
  return `You finished ${ordinal(me.rank)} with ${pts}. ${parts.map((x, i) => (i > 0 && x.startsWith("You ") ? x.slice(4) : x)).join(" and ")}.`;
}

function Cta({ nextWeek }: { nextWeek: number | null }) {
  if (nextWeek === null) {
    return <span className={`inline-flex min-h-11 items-center ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]`}>Picks drop Monday</span>;
  }
  return (
    <Link
      href="/runitback/play"
      className={`inline-flex min-h-11 items-center bg-[var(--color-red)] px-5 ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors hover:bg-[var(--color-bone)]`}
    >
      Play Week {nextWeek}
    </Link>
  );
}

export function LastWeekCard({ last, className, variant = "banner", on }: Props) {
  if (!last) return null;
  const { week, jaiye, remi, winnerName, winnerPoints, top, beat, nextWeek, me } = last;
  const grading = last.status === "graded";
  const href = `/runitback/${SB_SEASON}/${weekSlug(week)}`;
  const headline = grading ? `Week ${week} is almost in the books.` : winnerName ? `${winnerName} won Week ${week}.` : `Week ${week} ended in a tie.`;
  const subline = grading ? `Jaiye ${jaiye} · Remi ${remi} so far.` : `${winnerPoints} points. Jaiye ${jaiye} · Remi ${remi}.`;
  const eyebrow = `Week ${week} · ${grading ? "Grading" : "Final"}`;

  if (variant === "line") {
    return (
      <p className={`${className ?? ""} text-[0.95rem] text-[var(--color-bone)]`}>
        <span className="font-semibold">
          Week {week}: {grading ? "grading" : winnerName ? `${winnerName} won` : "tied"}
        </span>
        <span className="text-[var(--color-mute)]"> · </span>
        <Link href={href} className={`inline-flex min-h-11 items-center ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-red)] underline-offset-4 hover:underline`}>
          Full results →
        </Link>
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div className={className}>
        <div className={`${mono} text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>{eyebrow}</div>
        <Link href={href} className={`mt-2 block ${serif} text-[1.35rem] font-black leading-tight tracking-[-0.02em] hover:text-[var(--color-red)]`}>
          {headline}
        </Link>
        <p className="mt-1 text-[0.9rem] tabular-nums text-[var(--color-mute)]">{subline}</p>
        <div className="mt-3">
          <Cta nextWeek={nextWeek} />
        </div>
      </div>
    );
  }

  return (
    <section aria-label={`Week ${week} result`} className={`relative overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-5 md:p-8 ${className ?? ""}`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--color-red)]" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start md:gap-10">
        <div>
          <div className={`flex items-center gap-2 ${mono} text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" />
            {eyebrow}
          </div>
          <h2 className={`mt-3 ${serif} text-[clamp(2rem,5vw,3.4rem)] font-black leading-[0.95] tracking-[-0.03em]`}>{headline}</h2>
          {me && !grading ? <p className="mt-3 text-[1.05rem] font-medium text-[var(--color-bone)]">{meLine(me)}</p> : null}
          <p className={`${me && !grading ? "mt-2" : "mt-3"} text-[1.05rem] tabular-nums text-[var(--color-bone)]`}>{subline}</p>
          {grading ? null : <p className="mt-1 text-[0.95rem] text-[var(--color-mute)]">{beatLine(beat)}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {on === "results" ? (
              <Link
                href="/runitback"
                className={`inline-flex min-h-11 items-center bg-[var(--color-red)] px-5 ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors hover:bg-[var(--color-bone)]`}
              >
                This week&apos;s picks →
              </Link>
            ) : (
              <>
                <Cta nextWeek={nextWeek} />
                <Link href={href} className={`inline-flex min-h-11 items-center ${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] underline-offset-4 hover:text-[var(--color-red)] hover:underline`}>
                  See the full board
                </Link>
              </>
            )}
          </div>
        </div>
        {top.length && !grading ? (
          <ol aria-label={`Week ${week} top five`} className="border border-[var(--color-line)]">
            {top.map((row, i) => {
              const rank = top.findIndex((t) => t.points === row.points) + 1;
              const house = isHouse(row.name);
              return (
                <li
                  key={`${row.name}-${i}`}
                  className={`flex min-h-11 items-center gap-3 px-3 ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${house ? "bg-[var(--color-black)]" : ""}`}
                >
                  <span className={`w-5 ${mono} text-[0.7rem] tabular-nums text-[var(--color-mute)]`}>{rank}</span>
                  <span className={`min-w-0 flex-1 truncate text-[0.95rem] ${house ? "font-semibold text-[var(--color-red)]" : "text-[var(--color-bone)]"}`}>{row.name}</span>
                  <span className={`${mono} text-[0.9rem] tabular-nums ${house ? "text-[var(--color-red)]" : "text-[var(--color-bone)]"}`}>{row.points}</span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
