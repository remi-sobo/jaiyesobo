import type { Metadata } from "next";
import Link from "next/link";
import { getChallenger, challengerByCode } from "@/lib/sportsbook/players";
import { getLeagueByCode, isMember, memberIds } from "@/lib/sportsbook/leagues";
import { loadPlayer } from "@/lib/app-api/server";
import { featuredWeekNumber } from "@/lib/sportsbook/view";
import { InviteJoin, JoinLeagueButton } from "@/components/sportsbook/public/league-bits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You've been challenged · Run It Back Picks",
  description: "Join the league and make your NBA picks. Free. No money, just bragging rights.",
  robots: { index: false },
  openGraph: { title: "Think you can beat me?", description: "Join my Run It Back Picks league. Free NBA picks, all season.", type: "website" },
};

const mono = "font-[family-name:var(--font-jetbrains)]";

export default async function InvitePage(props: PageProps<"/runitback/l/[code]">) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const from = typeof sp.from === "string" ? sp.from : null;
  const league = await getLeagueByCode(code);

  if (!league) {
    return (
      <main className="px-5 py-[clamp(64px,10vw,140px)]">
        <div className="mx-auto max-w-[560px] text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,6vw,3.2rem)] font-black leading-tight">That invite doesn&apos;t work anymore.</h1>
          <p className="mt-4 text-[var(--color-mute)]">Ask whoever sent it for a new link. You can still play against Jaiye and Remi.</p>
          <Link href="/runitback/play" className="mt-8 inline-flex min-h-12 items-center bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)]">
            Play this week
          </Link>
        </div>
      </main>
    );
  }

  const [me, members, week, inviterId] = await Promise.all([getChallenger(), memberIds(league.id), featuredWeekNumber(), from ? challengerByCode(from) : Promise.resolve(null)]);
  const inviter = inviterId ? await loadPlayer(inviterId) : null;
  const inviterName = inviter && !inviter.hidden ? inviter.display_name : null;
  const already = me ? await isMember(league.id, me.id) : false;

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)]">
      <div className="mx-auto max-w-[560px]">
        <div className={`${mono} text-center text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back Picks</div>
        <h1 className="mt-5 text-center font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,7vw,3.8rem)] font-black leading-[0.95] tracking-[-0.03em]">
          {inviterName ? `${inviterName} challenged you.` : "You've been challenged."}
        </h1>
        <div className="mt-8 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-5 text-center">
          <div className="font-[family-name:var(--font-fraunces)] text-2xl font-black">{league.name}</div>
          <div className={`${mono} mt-2 text-[0.72rem] uppercase tracking-[0.15em] text-[var(--color-mute)]`}>
            {members.length} {members.length === 1 ? "player" : "players"}
            {week ? ` · Week ${week}` : ""} · Code {league.code}
          </div>
        </div>
        <p className="mt-6 text-center text-[1rem] leading-relaxed text-[var(--color-mute)]">
          A new slate of NBA picks every Monday. Everyone plays the same picks. Most points wins the week, and the board runs all season. Free. No money, ever.
        </p>
        <div className="mt-8">
          {already ? (
            <div className="text-center">
              <Link href={`/runitback/leagues/${league.id}`} className="inline-flex min-h-12 items-center bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)]">
                You&apos;re in. See the board
              </Link>
            </div>
          ) : me ? (
            <JoinLeagueButton code={league.code} from={from} name={league.name} />
          ) : (
            <InviteJoin code={league.code} from={from} />
          )}
        </div>
      </div>
    </main>
  );
}
