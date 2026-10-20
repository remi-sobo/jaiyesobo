import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";
import { JoinForm, PlayBoard } from "@/components/sportsbook/public/challenger-play";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beat the Sobos · Sobo Sportsbook",
  description: "Play this week's NBA slate against Jaiye and Remi. Just a name, no sign up.",
  openGraph: { title: "Think you can beat Jaiye and Remi?", description: "Play this week's NBA slate. Just a name, no sign up.", type: "website" },
};

export default async function PlayPage() {
  const me = await getChallenger();
  const n = await featuredWeekNumber().catch(() => null);
  const view = n ? await loadWeekView(n, { viewerId: me?.id ?? null }) : null;
  const open = view?.week.status === "open";

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border-2 border-[var(--color-red)] shadow-[0_0_40px_rgba(230,57,70,0.35)]">
            <Image src="/jaiye-hero.jpg" alt="Jaiye in his number 23 jersey" fill sizes="112px" className="object-cover object-[center_18%]" />
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">Sobo Sportsbook</div>
          <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,7vw,4.6rem)] font-black leading-[0.9] tracking-[-0.04em]">
            Beat the <em className="font-normal italic text-[var(--color-red)]">Sobos.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-[50ch] text-[1rem] leading-relaxed text-[var(--color-mute)]">
            Same picks as Jaiye and Remi, same points. Most points by Sunday night wins the week. No money, just bragging rights.
          </p>
          <Link href="/sportsbook" className="mt-4 inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)]">
            See the leaderboard
          </Link>
        </header>
        {!me ? (
          <JoinForm />
        ) : !open || !view ? (
          <p className="text-center text-[1.05rem] text-[var(--color-mute)]">
            No slate is open right now, {me.display_name}. New picks drop every Monday.
          </p>
        ) : (
          <PlayBoard me={me} items={view.items} picks={view.picks} now={view.now} />
        )}
      </div>
    </main>
  );
}
