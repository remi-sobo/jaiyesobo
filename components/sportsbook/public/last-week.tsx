import Link from "next/link";
import { SB_SEASON, weekSlug } from "@/lib/sportsbook/weeks";

/**
 * "Last week" callout for the top of /runitback and the home-page panel.
 * Sunday is the transition day — a visitor who lands on Sunday morning
 * for the new week should immediately see who won the week that just
 * closed. The caller decides which prior week to feature (usually the
 * latest finalized one); when `prior` is null, nothing renders.
 */
export type LastWeekRow = {
  week: number;
  jaiye: number;
  remi: number;
  /** Display name of the winner, or null for a tie. */
  winnerName: string | null;
};

type Props = {
  prior: LastWeekRow | null;
  className?: string;
  /** `banner` for the top of /runitback, `compact` for the home-page panel. */
  variant?: "banner" | "compact";
};

export function LastWeekBanner({ prior, className, variant = "banner" }: Props) {
  if (!prior) return null;
  const { week, jaiye, remi, winnerName } = prior;
  const headline = winnerName ? `${winnerName} took it` : "A tie — nobody budged";
  const href = `/runitback/${SB_SEASON}/${weekSlug(week)}`;

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-bone)] ${className ?? ""}`}
      >
        <span className="text-[var(--color-red)]">Week {week} final</span>
        <span className="tabular-nums text-[var(--color-bone)]">
          Jaiye {jaiye} · Remi {remi}
        </span>
        <span>· {headline} →</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`block border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-4 py-3 transition-colors hover:border-[var(--color-red)] md:px-6 md:py-4 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" />
          Last week · Week {week} · Final
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.95rem] tabular-nums text-[var(--color-bone)]">
          Jaiye {jaiye} · Remi {remi}
        </span>
        <span className="font-[family-name:var(--font-fraunces)] text-[1.05rem] font-black italic text-[var(--color-bone)]">
          {headline}.
        </span>
        <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          See the board →
        </span>
      </div>
    </Link>
  );
}
