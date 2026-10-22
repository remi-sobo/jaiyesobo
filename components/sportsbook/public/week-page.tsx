import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { getVisitor, loadReactions, loadVotes } from "@/lib/sportsbook/fans";
import { listWeeks } from "@/lib/sportsbook/data";
import { loadSeason, loadWeekView } from "@/lib/sportsbook/view";
import { currentWeekNumber, weekRangeLabel, weekSlug } from "@/lib/sportsbook/weeks";
import { FanVote } from "./fan-bits";
import { PublicCard, SeasonStandings } from "./public-week";
import PlayerBoard from "./player-board";
import VideoPopout from "@/components/site/video-popout";
import { sportsbookEpisode } from "@/lib/content/episodes";
import { pad } from "@/lib/content/format";
import { scheduleLiveSync } from "@/lib/sportsbook/live";
import { OpeningWeekBanner, PlayButton, SportsbookHero, Ticker } from "./hero";

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
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">Sobo Sportsbook</div>
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

/** The whole public page for one week. Used by /sportsbook and the archive. */
export default async function WeekPage({ n, featured }: { n: number; featured: boolean }) {
  scheduleLiveSync();
  const me = await getChallenger();
  const view = await loadWeekView(n, { viewerId: me?.id ?? null });
  if (!view) return null;
  const visitor = await getVisitor(false);
  const [reactions, votes, season, weeks] = await Promise.all([
    loadReactions(view.items.map((i) => i.id), visitor),
    loadVotes(view.week.id, visitor),
    featured ? loadSeason() : Promise.resolve(null),
    listWeeks(),
  ]);
  const house = { jaiye: view.players.find((p) => p.kind === "jaiye"), remi: view.players.find((p) => p.kind === "remi") };
  const now = view.now;
  const published = weeks.filter((w) => w.status !== "draft").sort((a, b) => b.week_number - a.week_number);
  const lastRecap = view.week.recap ? view.week : published.find((w) => w.status === "final" && w.recap && w.week_number < n);
  const isOpen = view.week.status === "open";
  const episode = sportsbookEpisode();

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1240px]">
        {n === 1 && currentWeekNumber(new Date(now)) === 1 ? <OpeningWeekBanner /> : null}
        <SportsbookHero
          jaiye={view.board.find((b) => b.player.kind === "jaiye")?.score.points ?? 0}
          remi={view.board.find((b) => b.player.kind === "remi")?.score.points ?? 0}
          weekLabel={`Week ${n} · ${weekRangeLabel(view.week)}${view.week.status === "final" ? " · Final" : ""}`}
          cta={
            isOpen ? (
              <div className="flex flex-col items-start gap-2">
                <PlayButton href="/sportsbook/play">{me ? `Make your picks, ${me.display_name}` : "Think you can beat us?"}</PlayButton>
                <span className="text-[0.8rem] text-[var(--color-mute)]">Same picks as us. Just type your name. No sign up.</span>
              </div>
            ) : null
          }
        />
        <Ticker items={view.items} />

        <div className="mt-[clamp(40px,6vw,72px)] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <Label>This week&apos;s picks</Label>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {view.items.map((item) => (
                <PublicCard key={item.id} item={item} picks={view.picks} players={view.players} house={house} reactions={reactions} now={now} />
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
            <div>
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

        {season ? (
          <section className="mt-[clamp(48px,7vw,88px)]">
            <Label>Who&apos;s winning the season</Label>
            <div className="mt-5">
              <SeasonStandings summary={season.summary} />
            </div>
          </section>
        ) : null}

        <section className="mt-[clamp(48px,7vw,88px)]">
          <Label>{published.length > 1 ? "Past weeks" : "Season archive"}</Label>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <ul className="flex flex-wrap gap-2">
              {published.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/sportsbook/${w.season}/${weekSlug(w.week_number)}`}
                    className={`inline-flex min-h-10 items-center border px-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] hover:border-[var(--color-red)] ${
                      w.week_number === n ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
                    }`}
                  >
                    Week {w.week_number}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/sportsbook/archive"
              className="inline-flex min-h-10 items-center justify-center bg-[var(--color-red)] px-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]"
            >
              {published.length > 1 ? "Open the full archive →" : "See every week →"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
