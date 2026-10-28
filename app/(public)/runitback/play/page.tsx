import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getChallenger } from "@/lib/sportsbook/players";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";
import { BrandLockup } from "@/components/sportsbook/public/brand-lockup";
import { JoinForm, PlayBoard } from "@/components/sportsbook/public/challenger-play";
import { OpeningWeekBanner } from "@/components/sportsbook/public/hero";
import { currentWeekNumber, requestNow } from "@/lib/sportsbook/weeks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beat Jaiye & Remi · Run It Back Picks",
  description: "Pick NBA games against me and my dad. Just type your name and play.",
  openGraph: { title: "Think you can beat Jaiye and Remi?", description: "Pick NBA games against me and my dad. Just type your name and play.", type: "website" },
};

export default async function PlayPage() {
  const me = await getChallenger();
  const n = await featuredWeekNumber().catch(() => null);
  const view = n ? await loadWeekView(n, { viewerId: me?.id ?? null }) : null;
  const open = view?.week.status === "open";

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1000px]">
        {currentWeekNumber(new Date(requestNow())) === 1 ? (
          <div className="mb-8">
            <OpeningWeekBanner />
          </div>
        ) : null}
        <header className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border-2 border-[var(--color-red)] shadow-[0_0_40px_rgba(230,57,70,0.35)]">
            <Image src="/jaiye-hero.jpg" alt="Jaiye in his number 23 jersey" fill sizes="112px" className="object-cover object-[center_18%]" />
          </div>
          <BrandLockup variant="wordmark" h={56} className="mx-auto" priority />
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,7vw,4.6rem)] font-black leading-[0.9] tracking-[-0.04em]">
            Beat Jaiye <em className="font-normal italic text-[var(--color-red)]">&amp; Remi.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-[50ch] text-[1rem] leading-relaxed text-[var(--color-mute)]">
            Pick the same games as me and my dad. Most points by Sunday night wins the week. No money, just bragging rights.
          </p>
          <Link href="/runitback" className="mt-4 inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)]">
            See who&apos;s winning
          </Link>
          {me ? (
            <Link href="/runitback/leagues" className="ml-5 mt-4 inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-red)]">
              Leagues and rivals
            </Link>
          ) : null}
        </header>
        {!me ? (
          <JoinForm />
        ) : !open || !view ? (
          <p className="text-center text-[1.05rem] text-[var(--color-mute)]">
            No picks are open right now, {me.display_name}. New ones drop every Monday.
          </p>
        ) : (
          <PlayBoard me={me} items={view.items} picks={view.picks} now={view.now} week={view.week.week_number} submitted={view.submitted.includes(me.id)} />
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          <span>Prefer the app?</span>
          {/* A plain anchor, not next/link: the app is a separate single-page build, and typed routes don't know it. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/runitback/app" className="inline-flex min-h-11 items-center text-[var(--color-bone)] underline underline-offset-4 hover:text-[var(--color-red)]">
            Open it
          </a>
        </div>
      </div>
    </main>
  );
}
