import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { getVisitor, loadReactions, loadVotes } from "@/lib/sportsbook/fans";
import { listWeeks } from "@/lib/sportsbook/data";
import { lastWeekRow, loadWeekView, weekResultRow } from "@/lib/sportsbook/view";
import { currentWeekNumber, pacificWeekday, weekRangeLabel, weekSlug } from "@/lib/sportsbook/weeks";
import { FanVote } from "./fan-bits";
import { LastWeekCard } from "./last-week";
import { PublicCard } from "./public-week";
import PlayerBoard from "./player-board";
import VideoPopout from "@/components/site/video-popout";
import { sportsbookEpisode } from "@/lib/content/episodes";
import { pad } from "@/lib/content/format";
import { scheduleLiveSync } from "@/lib/sportsbook/live";
import { canPostTalk, loadTalk, playerFlags } from "@/lib/sportsbook/safety";
import { myLeagues } from "@/lib/sportsbook/leagues";
import { OpeningWeekBanner, OpenAppLink, PlayButton, SportsbookHero, Ticker } from "./hero";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
      <span className="h-px w-8 bg-[var(--color-red)]" />
      {children}
    </div>
  );
}

export function SportsbookEmpty() {
  return (
    <main className="px-5 py-[clamp(64px,10vw,140px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[900px] text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">Run It Back Picks</div>
        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,7vw,5rem)] font-black leading-[0.9] tracking-[-0.04em]">
          Jaiye vs Remi. <em className="font-normal italic text-[var(--color-red)]">Coming soon.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
          Me vs my dad, picking NBA games every week. First picks drop soon. Get ready.
        </p>
      </div>
    </main>
  );
}

function WeekArrows({ n, week, prev, next }: { n: number; week: { starts_on: string; ends_on: string; status: string }; prev: { season: string; week_number: number } | null; next: { season: string; week_number: number } | null }) {
  const arrow = "inline-flex h-11 w-11 items-center justify-center border text-[1.1rem]";
  return (
    <div className="flex items-center gap-3">
      {prev ? (
        <Link href={`/runitback/${prev.season}/${weekSlug(prev.week_number)}`} aria-label={`Week ${prev.week_number}`} className={`${arrow} border-[var(--color-line-strong)] hover:border-[var(--color-red)]`}>
          ‹
        </Link>
      ) : (
        <span aria-disabled="true" className={`${arrow} border-[var(--color-line)] text-[var(--color-mute)] opacity-40`}>
          ‹
        </span>
      )}
      {next ? (
        <Link href={`/runitback/${next.season}/${weekSlug(next.week_number)}`} aria-label={`Week ${next.week_number}`} className={`${arrow} border-[var(--color-line-strong)] hover:border-[var(--color-red)]`}>
          ›
        </Link>
      ) : (
        <span aria-disabled="true" className={`${arrow} border-[var(--color-line)] text-[var(--color-mute)] opacity-40`}>
          ›
        </span>
      )}
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
        Week {n} · {weekRangeLabel(week)} · {week.status === "final" ? "Final" : "Grading"}
      </span>
    </div>
  );
}

/** The whole public page for one week. Used by /sportsbook and the archive. */
export default async function WeekPage({ n, featured }: { n: number; featured: boolean }) {
  scheduleLiveSync();
  const me = await getChallenger();
  const view = await loadWeekView(n, { viewerId: me?.id ?? null });
  if (!view) return null;
  const visitor = await getVisitor(false);
  const isOpen = view.week.status === "open";
  const isDone = view.week.status === "final" || view.week.status === "graded";
  const [reactions, votes, weeks, lastWeek, thisResult] = await Promise.all([
    loadReactions(view.items.map((i) => i.id), visitor),
    loadVotes(view.week.id, visitor),
    listWeeks(),
    // The featured page leads with the latest final week: the one before this
    // week while it is open, or this week itself once nothing is open.
    featured ? lastWeekRow(isOpen ? n : n + 1, me?.id).catch(() => null) : Promise.resolve(null),
    !featured && isDone ? weekResultRow(n, me?.id).catch(() => null) : Promise.resolve(null),
  ]);
  const lockedIds = view.items.filter((i) => Date.parse(i.locks_at) <= view.now || view.week.status !== "open").map((i) => i.id);
  const [talkLines, meFlags, leagues] = await Promise.all([
    loadTalk(lockedIds, me?.id ?? null),
    me ? playerFlags(me.id) : Promise.resolve(null),
    me ? myLeagues(me.id) : Promise.resolve([]),
  ]);
  const nameOf = new Map(view.players.map((p) => [p.id, p.display_name]));
  const talkFor = (itemId: string) => {
    const lines = talkLines.filter((t) => t.item_id === itemId).map((t) => ({ player_id: t.player_id, name: nameOf.get(t.player_id) ?? "Player", text: t.text }));
    const iPicked = !!me && view.picks.some((p) => p.item_id === itemId && p.player_id === me.id);
    return { lines, meId: me?.id ?? null, canTalk: iPicked && canPostTalk(meFlags), myLine: lines.find((l) => l.player_id === me?.id)?.text ?? null };
  };
  const house = { jaiye: view.players.find((p) => p.kind === "jaiye"), remi: view.players.find((p) => p.kind === "remi") };
  const now = view.now;
  const published = weeks.filter((w) => w.status !== "draft").sort((a, b) => b.week_number - a.week_number);
  const lastRecap = view.week.recap ? view.week : published.find((w) => w.status === "final" && w.recap && w.week_number < n);
  const episode = sportsbookEpisode(n);
  // Monday and Tuesday (Pacific), or any time nothing is open, lead with last week's result.
  const weekday = pacificWeekday(new Date(now));
  const resultBanner = featured && (weekday === 1 || weekday === 2 || !isOpen);
  const prevWeek = published.filter((w) => w.week_number < n).sort((a, b) => b.week_number - a.week_number)[0] ?? null;
  const nextWeekLink = published.filter((w) => w.week_number > n).sort((a, b) => a.week_number - b.week_number)[0] ?? null;
  const top5 = view.board.slice(0, 5);

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1240px]">
        {resultBanner ? <LastWeekCard last={lastWeek} className="mb-6" /> : null}
        {!featured && isDone ? (
          <div className="mb-6">
            <WeekArrows n={n} week={view.week} prev={prevWeek} next={nextWeekLink} />
            <LastWeekCard last={thisResult} on="results" className="mt-4" />
          </div>
        ) : null}
        {n === 1 && currentWeekNumber(new Date(now)) === 1 ? <OpeningWeekBanner /> : null}
        <SportsbookHero
          jaiye={view.board.find((b) => b.player.kind === "jaiye")?.score.points ?? 0}
          remi={view.board.find((b) => b.player.kind === "remi")?.score.points ?? 0}
          weekLabel={`Week ${n} · ${weekRangeLabel(view.week)}${view.week.status === "final" ? " · Final" : ""}`}
          cta={
            isOpen ? (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
                <div className="flex flex-col items-start gap-2">
                  <PlayButton href="/runitback/play">{me ? `Make your picks, ${me.display_name}` : "Think you can beat us?"}</PlayButton>
                  <span className="text-[0.8rem] text-[var(--color-mute)]">Same picks as us. Just type your name. No sign up.</span>
                </div>
                <OpenAppLink />
              </div>
            ) : (
              <OpenAppLink />
            )
          }
        />
        <Ticker items={view.items} />
        {me ? (
          <nav aria-label="Your leagues" className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">Your leagues</span>
            <span className="inline-flex min-h-9 items-center border border-[var(--color-red)] px-3 text-[0.82rem]">Beat Jaiye &amp; Remi</span>
            {leagues.map((l) => (
              <Link key={l.id} href={`/runitback/leagues/${l.id}`} className="inline-flex min-h-9 items-center border border-[var(--color-line-strong)] px-3 text-[0.82rem] hover:border-[var(--color-red)]">
                {l.name}
              </Link>
            ))}
            <Link href="/runitback/leagues" className="inline-flex min-h-9 items-center px-2 text-[0.82rem] text-[var(--color-mute)] underline-offset-4 hover:underline">
              {leagues.length ? "Leagues and rivals" : "Join a league"}
            </Link>
          </nav>
        ) : null}

        <div className="mt-[clamp(40px,6vw,72px)] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            {featured && !resultBanner ? <LastWeekCard last={lastWeek} variant="line" className="mb-4" /> : null}
            {featured && top5.length ? (
              <div className="mb-8 lg:hidden">
                <Label>Week {n} leaderboard</Label>
                <ol aria-label={`Week ${n} top five`} className="mt-4 border border-[var(--color-line)]">
                  {top5.map((b, i) => {
                    const rank = view.board.filter((x) => x.score.points > b.score.points).length + 1;
                    const house = b.player.kind !== "challenger";
                    return (
                      <li key={b.player.id} className={`flex min-h-11 items-center gap-3 px-3 ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${house ? "bg-[var(--color-black)]" : ""}`}>
                        <span className="w-5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] tabular-nums text-[var(--color-mute)]">{rank}</span>
                        <span className={`min-w-0 flex-1 truncate text-[0.95rem] ${house ? "font-semibold text-[var(--color-red)]" : "text-[var(--color-bone)]"}`}>{b.player.display_name}</span>
                        <span className={`font-[family-name:var(--font-jetbrains)] text-[0.9rem] tabular-nums ${house ? "text-[var(--color-red)]" : "text-[var(--color-bone)]"}`}>{b.score.points}</span>
                      </li>
                    );
                  })}
                </ol>
                <a href="#board" className="mt-1 inline-flex min-h-11 items-center font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] underline-offset-4 hover:text-[var(--color-red)] hover:underline">
                  Full board ↓
                </a>
              </div>
            ) : null}
            <Label>This week&apos;s picks</Label>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {view.items.map((item) => (
                <PublicCard key={item.id} item={item} picks={view.picks} players={view.players} house={house} reactions={reactions} now={now} talk={talkFor(item.id)} />
              ))}
            </div>
          </section>
          <aside className="flex flex-col gap-8">
            {episode ? (
              <div>
                <Label>Watch me break it down</Label>
                <div className="mt-4">
                  <VideoPopout
                    youtubeId={episode.youtubeId}
                    title={episode.title}
                    label={`EP. ${pad(episode.number)} · On The Court`}
                    href={`/pod/${episode.slug}`}
                    compact
                  />
                </div>
              </div>
            ) : null}
            <FanVote weekId={view.week.id} open={isOpen} tally={votes} />
            <div id="board" className="scroll-mt-6">
              <Label>Week {n} leaderboard</Label>
              <div className="mt-4">
                <PlayerBoard board={view.board} items={view.items} picks={view.picks} now={now} />
              </div>
            </div>
          </aside>
        </div>

        {lastRecap?.recap ? (
          <section className="mt-[clamp(48px,7vw,88px)]">
            <Label>Week {lastRecap.week_number} recap</Label>
            <p className="mt-5 max-w-[68ch] whitespace-pre-line font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,2.2vw,1.45rem)] leading-snug">{lastRecap.recap}</p>
          </section>
        ) : null}

        {featured ? (
          <div className="mt-[clamp(40px,6vw,72px)]">
            <Link href="/runitback/standings" className="inline-flex min-h-11 items-center font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] underline-offset-4 hover:text-[var(--color-red)] hover:underline">
              Season standings →
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
