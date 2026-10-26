import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallenger } from "@/lib/sportsbook/players";
import { getLeague, isMember, memberIds, myLeagues } from "@/lib/sportsbook/leagues";
import { apiLeague, loadPlayer, seasonBoardFor, weekBoardFor } from "@/lib/app-api/server";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";
import { getPicks } from "@/lib/sportsbook/data";
import { createServiceClient } from "@/lib/supabase/server";
import { BoardTable } from "@/components/sportsbook/public/league-board";
import { CopyInvite, LeaveLeague } from "@/components/sportsbook/public/league-bits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League · Run It Back Picks", robots: { index: false } };

const mono = "font-[family-name:var(--font-jetbrains)]";

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className={`${mono} mb-4 text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>{children}</h2>;
}

export default async function LeaguePage(props: PageProps<"/runitback/leagues/[id]">) {
  const { id } = await props.params;
  const me = await getChallenger();
  const league = await getLeague(id);
  if (!league || !me || !(await isMember(league.id, me.id))) notFound();

  const player = (await loadPlayer(me.id))!;
  const n = await featuredWeekNumber();
  const view = n ? await loadWeekView(n, { viewerId: me.id }) : null;
  const ref = { id: league.id, name: league.name };
  const [weekBoard, seasonBoard, ids, mine] = await Promise.all([
    view ? weekBoardFor(view, me.id, ref) : Promise.resolve(null),
    seasonBoardFor(me.id, ref),
    memberIds(league.id),
    myLeagues(me.id),
  ]);
  const withCount = mine.find((l) => l.id === league.id)!;
  const api = apiLeague(withCount, player);
  const isComm = league.commissioner_id === me.id;

  // Commissioner view: who hasn't picked this week.
  let waiting: string[] = [];
  if (isComm && view && view.week.status === "open") {
    const all = await getPicks(view.items.map((i) => i.id));
    const picked = new Set(all.filter((p) => p.choice !== null || p.guess !== null).map((p) => p.player_id));
    const { data } = await createServiceClient().from("sb_players").select("id, display_name").in("id", ids.filter((x) => !picked.has(x)));
    waiting = (data ?? []).map((p) => p.display_name as string);
  }

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-12">
        <header className="flex flex-col gap-3">
          <Link href="/runitback/leagues" className={`${mono} text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)]`}>
            ← Your leagues
          </Link>
          <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,6vw,3.6rem)] font-black leading-none tracking-[-0.03em]">{league.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`${mono} text-[0.75rem] uppercase tracking-[0.15em] text-[var(--color-mute)]`}>
              Code {league.code} · {ids.length} players{isComm ? " · You run it" : ""}
            </span>
            <CopyInvite url={api.invite_url} />
            <Link href="/runitback/play" className={`${mono} inline-flex min-h-11 items-center bg-[var(--color-red)] px-4 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--color-black)]`}>
              Make your picks
            </Link>
          </div>
        </header>

        {isComm && waiting.length ? (
          <section className="border border-[var(--color-games-yellow)] p-4">
            <Label>Still need to pick</Label>
            <p className="text-[0.95rem]">{waiting.join(", ")}</p>
            <p className="mt-2 text-[0.85rem] text-[var(--color-mute)]">Send them the invite link as a reminder. Nudges from the iPhone app are coming.</p>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {weekBoard ? (
            <section>
              <Label>Week {weekBoard.week}</Label>
              <BoardTable board={weekBoard} />
            </section>
          ) : null}
          <section>
            <Label>Season</Label>
            <BoardTable board={seasonBoard} />
          </section>
        </div>

        {!isComm ? <LeaveLeague leagueId={league.id} /> : null}
      </div>
    </main>
  );
}
