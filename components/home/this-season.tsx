import Link from "next/link";
import { getJaiye } from "@/lib/data";
import { getLatestPublishedPrediction } from "@/lib/nba/data";
import { CURRENT_SEASON, deriveBracket } from "@/lib/nba/logic";
import { TEAMS, type TeamCode } from "@/lib/nba/teams";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";
import { scheduleLiveSync } from "@/lib/sportsbook/live";
import { currentWeekNumber, weekRangeLabel } from "@/lib/sportsbook/weeks";
import { SectionLabel } from "@/components/site/type";
import { TeamTile } from "@/components/predictions/team-tile";
import { BrandLockup } from "@/components/sportsbook/public/brand-lockup";
import { CourtLines, ScoreBox } from "@/components/sportsbook/public/hero";
import VideoPopout from "@/components/site/video-popout";
import { sportsbookEpisode } from "@/lib/content/episodes";
import { pad } from "@/lib/content/format";

type BookState = {
  week: number;
  range: string;
  jaiye: number;
  remi: number;
  open: boolean;
  opening: boolean;
  teaser: string | null;
  challengers: number;
} | null;

type PredictionState = {
  champion: TeamCode | null;
  headline: string | null;
  season: string;
} | null;

/** Everything here is optional: if the database is unreachable the section still renders. */
async function loadBook(): Promise<BookState> {
  try {
    const n = await featuredWeekNumber();
    if (!n) return null;
    const view = await loadWeekView(n);
    if (!view) return null;
    const pts = (kind: "jaiye" | "remi") => view.board.find((b) => b.player.kind === kind)?.score.points ?? 0;
    const upset = view.items.find((i) => i.type === "upset") ?? view.items[0];
    return {
      week: n,
      range: weekRangeLabel(view.week),
      jaiye: pts("jaiye"),
      remi: pts("remi"),
      open: view.week.status === "open",
      opening: n === 1 && currentWeekNumber(new Date(view.now)) === 1,
      teaser: upset?.prompt ?? null,
      challengers: view.challengerCount,
    };
  } catch {
    return null;
  }
}

async function loadPrediction(): Promise<PredictionState> {
  try {
    const jaiye = await getJaiye();
    const row = jaiye ? await getLatestPublishedPrediction(jaiye.id) : null;
    if (!row) return null;
    const f = deriveBracket(row).FINALS;
    const loser = f.winner && f.top && f.bottom ? (f.top.code === f.winner ? f.bottom.code : f.top.code) : null;
    return {
      champion: f.winner,
      headline: f.winner && loser && f.games ? `${f.winner} beats ${loser} 4-${f.games - 4}` : null,
      season: row.season,
    };
  } catch {
    return null;
  }
}

const btn =
  "inline-flex min-h-12 items-center gap-3 px-[22px] py-[14px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] transition-colors duration-300";

export function SportsbookPanel({ book }: { book: BookState }) {
  const episode = sportsbookEpisode();
  return (
    <div className="runitback-brand relative flex flex-col overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-black)] p-6 md:p-8">
      <CourtLines />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--color-red)]" />
      <div className="relative flex flex-wrap items-center gap-3">
        <BrandLockup variant="wordmark" h={44} />
        {book ? (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
            Week {book.week} · {book.range}
          </span>
        ) : null}
        {book?.opening ? (
          <span className="bg-[var(--color-red)] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-black)]">🎉 Opening Week</span>
        ) : null}
      </div>

      <h2 className="relative mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,5vw,3.8rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]">
        <span className="text-[var(--color-red)]">Jaiye</span>{" "}
        <em className="font-normal lowercase text-[var(--color-mute)]">vs</em> Remi
      </h2>
      <p className="relative mt-4 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
        Me and my dad pick NBA games every week. Whoever gets the most right wins the week. You can play too!
      </p>

      <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
        <div className="flex max-w-[380px] gap-2">
          <ScoreBox name="Jaiye" points={book?.jaiye ?? 0} tone="red" />
          <ScoreBox name="Remi" points={book?.remi ?? 0} tone="bone" />
        </div>
        {episode ? (
          <VideoPopout
            youtubeId={episode.youtubeId}
            title={episode.title}
            label={`EP. ${pad(episode.number)} · Watch`}
            href={`/pod/${episode.slug}`}
            compact
          />
        ) : null}
      </div>

      {book?.teaser ? (
        <div className="relative mt-6 border-l-2 border-[var(--color-red)] pl-4">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">This week</div>
          <div className="mt-1 font-[family-name:var(--font-fraunces)] text-[1.2rem] font-black leading-tight tracking-[-0.02em]">{book.teaser}</div>
        </div>
      ) : null}

      <div className="relative mt-8 flex flex-wrap items-center gap-3">
        {book?.open ? (
          <Link href="/runitback/play" className={`${btn} bg-[var(--color-red)] text-[var(--color-black)] hover:bg-[var(--color-bone)]`}>
            <span aria-hidden className="h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--color-black)]" />
            Beat Jaiye & Remi
          </Link>
        ) : null}
        <Link href="/runitback" className={`${btn} border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)]`}>
          See who&apos;s winning
        </Link>
        {book && book.challengers > 0 ? (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
            {book.challengers} {book.challengers === 1 ? "challenger" : "challengers"} this week
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PredictionsPanel({ pred }: { pred: PredictionState }) {
  const champ = pred?.champion ? TEAMS[pred.champion] : null;
  return (
    <div className="relative flex flex-col overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-black)] p-6 md:p-8">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: champ?.primary ?? "var(--color-line-strong)" }} />
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
        NBA Predictions · {pred?.season ?? CURRENT_SEASON}
      </div>
      <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4vw,2.8rem)] font-black leading-[0.92] tracking-[-0.03em]">
        {champ ? (
          <>
            My pick to win it all: <em className="font-normal italic text-[var(--color-red)]">{champ.name}.</em>
          </>
        ) : (
          <>
            My picks for <em className="font-normal italic text-[var(--color-red)]">this season.</em>
          </>
        )}
      </h2>

      <div className="mt-6 flex flex-1 items-center gap-5">
        {pred?.champion ? (
          <TeamTile code={pred.champion} size="lg" />
        ) : (
          <div className="flex h-[132px] w-[132px] shrink-0 items-center justify-center border border-dashed border-[var(--color-line-strong)] font-[family-name:var(--font-fraunces)] text-[3rem] font-black text-[var(--color-line-strong)]">
            ?
          </div>
        )}
        <div className="min-w-0">
          {pred?.headline ? (
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.85rem] uppercase tracking-[0.12em] text-[var(--color-bone)]">{pred.headline}</div>
          ) : null}
          <p className="mt-2 text-[0.95rem] leading-[1.6] text-[var(--color-mute)]">
            {pred
              ? "Who makes the playoffs, who wins every series, and who wins MVP. I can't change them now."
              : "Who makes the playoffs, who wins every series, and who wins MVP. I'm still working on them. Once I post them, I can't change them."}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/predictions" className={`${btn} border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)]`}>
          {pred ? "See all my picks" : "Check it out"}
        </Link>
      </div>
    </div>
  );
}

export default async function ThisSeason() {
  scheduleLiveSync();
  const [book, pred] = await Promise.all([loadBook(), loadPrediction()]);
  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel tone="red">The 2026-27 season</SectionLabel>
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <SportsbookPanel book={book} />
          <PredictionsPanel pred={pred} />
        </div>
      </div>
    </section>
  );
}
