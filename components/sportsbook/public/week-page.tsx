import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { getVisitor, loadReactions, loadVotes } from "@/lib/sportsbook/fans";
import { listWeeks } from "@/lib/sportsbook/data";
import { loadSeason, loadWeekView } from "@/lib/sportsbook/view";
import { weekRangeLabel, weekSlug } from "@/lib/sportsbook/weeks";
import { FanVote } from "./fan-bits";
import { PublicCard, ScoreHeader, SeasonStandings, WeekBoard } from "./public-week";

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
          A weekly NBA pick&apos;em all season long. No money, just bragging rights. The first slate drops soon.
        </p>
      </div>
    </main>
  );
}

/** The whole public page for one week. Used by /sportsbook and the archive. */
export default async function WeekPage({ n, featured }: { n: number; featured: boolean }) {
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

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1240px]">
        <header className="text-center">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">Sobo Sportsbook</div>
          <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,8vw,5.6rem)] font-black uppercase leading-[0.88] tracking-[-0.04em]">
            Jaiye <span className="font-normal italic lowercase text-[var(--color-red)]">vs</span> Remi
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[1rem] leading-relaxed text-[var(--color-mute)]">
            A weekly NBA pick&apos;em, all season long. No money, just bragging rights. Anyone can jump in.
          </p>
          <div className="mt-8">
            <ScoreHeader board={view.board} house={house} label={`Week ${n} · ${weekRangeLabel(view.week)}${view.week.status === "final" ? " · Final" : ""}`} />
          </div>
          {isOpen ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Link
                href="/sportsbook/play"
                className="inline-flex min-h-12 items-center gap-3 bg-[var(--color-red)] px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.75rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors hover:bg-[var(--color-bone)]"
              >
                {me ? `Make your picks, ${me.display_name}` : "Think you can beat us? Play this week"}
              </Link>
              <span className="text-[0.8rem] text-[var(--color-mute)]">Same picks, same points. Just a name, no sign up.</span>
            </div>
          ) : null}
        </header>

        <div className="mt-[clamp(40px,6vw,72px)] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <Label>This week&apos;s slate</Label>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {view.items.map((item) => (
                <PublicCard key={item.id} item={item} picks={view.picks} players={view.players} house={house} reactions={reactions} now={now} />
              ))}
            </div>
          </section>
          <aside className="flex flex-col gap-8">
            <FanVote weekId={view.week.id} open={isOpen} tally={votes} />
            <div>
              <Label>Week {n} leaderboard</Label>
              <div className="mt-4">
                <WeekBoard board={view.board} />
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
            <Label>Season standings</Label>
            <div className="mt-5">
              <SeasonStandings summary={season.summary} />
            </div>
          </section>
        ) : null}

        {published.length > 1 ? (
          <section className="mt-[clamp(48px,7vw,88px)]">
            <Label>Every week</Label>
            <ul className="mt-4 flex flex-wrap gap-2">
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
          </section>
        ) : null}
      </div>
    </main>
  );
}
