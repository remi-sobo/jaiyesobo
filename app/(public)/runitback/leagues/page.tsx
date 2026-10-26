import type { Metadata } from "next";
import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { apiLeagues, apiRivals, loadPlayer } from "@/lib/app-api/server";
import { CopyInvite, JoinByCode } from "@/components/sportsbook/public/league-bits";
import { RivalList } from "@/components/sportsbook/public/league-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Leagues and rivals · Run It Back Picks", robots: { index: false } };

const mono = "font-[family-name:var(--font-jetbrains)]";

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className={`${mono} text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>{children}</h2>;
}

export default async function LeaguesPage() {
  const me = await getChallenger();
  if (!me) {
    return (
      <main className="px-5 py-[clamp(64px,10vw,120px)]">
        <div className="mx-auto max-w-[560px] text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,6vw,3rem)] font-black">Join first, then pick your crew.</h1>
          <Link href="/runitback/play" className="mt-8 inline-flex min-h-12 items-center bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)]">
            Play this week
          </Link>
        </div>
      </main>
    );
  }
  const player = (await loadPlayer(me.id))!;
  const [leagues, rivals] = await Promise.all([apiLeagues(player), apiRivals(me.id)]);

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto flex max-w-[900px] flex-col gap-12">
        <header>
          <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back Picks</div>
          <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,6vw,3.6rem)] font-black leading-none tracking-[-0.03em]">Your leagues</h1>
          <p className="mt-3 text-[var(--color-mute)]">Playing as {me.display_name}. Everyone is in Beat Jaiye &amp; Remi.</p>
        </header>

        <section className="flex flex-col gap-3">
          <Link href="/runitback" className="flex min-h-16 items-center justify-between border border-[var(--color-red)] bg-[var(--color-off-black)] px-4">
            <span className="font-[family-name:var(--font-fraunces)] text-xl font-black">Beat Jaiye &amp; Remi</span>
            <span className={`${mono} text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-mute)]`}>Everyone</span>
          </Link>
          {leagues.map((l) => (
            <div key={l.id} className="flex min-h-16 flex-wrap items-center gap-3 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-4 py-2">
              <Link href={`/runitback/leagues/${l.id}`} className="min-w-0 flex-1 font-[family-name:var(--font-fraunces)] text-xl font-black hover:text-[var(--color-red)]">
                {l.name}
              </Link>
              <span className={`${mono} text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-mute)]`}>
                {l.members} players{l.is_commissioner ? " · You run it" : ""}
              </span>
              <CopyInvite url={l.invite_url} />
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <Label>Join a league</Label>
          <p className="text-[0.95rem] text-[var(--color-mute)]">Got a code from a friend? Put it here. Starting your own league comes with the Season Pass in the iPhone app.</p>
          <JoinByCode />
        </section>

        <section className="flex flex-col gap-3">
          <Label>Your rivals</Label>
          <RivalList rivals={rivals} />
        </section>
      </div>
    </main>
  );
}
