import type { Metadata } from "next";
import Link from "next/link";
import { PassBuyButton } from "@/components/sportsbook/public/pass-buy-button";
import { SEASON_PASS_CENTS, hasPass } from "@/lib/sportsbook/pass";
import { getChallenger } from "@/lib/sportsbook/players";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Season Pass · Run It Back Picks", robots: { index: false } };

const mono = "font-[family-name:var(--font-jetbrains)]";
const PRICE = `$${(SEASON_PASS_CENTS / 100).toFixed(2)}`;
const linkCta = `mt-2 inline-flex min-h-12 items-center self-start bg-[var(--color-red)] px-6 ${mono} text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]`;

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className={`${mono} text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]`}>{children}</h2>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto flex max-w-[560px] flex-col gap-8">
        <header>
          <div className={`${mono} text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]`}>Run It Back Picks</div>
          <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,6vw,3.6rem)] font-black leading-none tracking-[-0.03em]">Season Pass</h1>
        </header>
        {children}
      </div>
    </main>
  );
}

export default async function PassPage({ searchParams }: { searchParams: Promise<{ done?: string | string[] }> }) {
  const [me, { done }] = await Promise.all([getChallenger(), searchParams]);

  if (!me) {
    return (
      <Shell>
        <p className="text-[1.05rem] leading-relaxed">Join or use your player code first, then come back.</p>
        <Link href="/runitback/play" className={linkCta}>
          Play this week
        </Link>
      </Shell>
    );
  }

  const { data: ageRow } = await createServiceClient().from("sb_players").select("age_band").eq("id", me.id).maybeSingle();
  if (ageRow?.age_band !== "13_plus") {
    return (
      <Shell>
        <p className="text-[1.05rem] leading-relaxed">The Season Pass is for players 13 and up. You can still join any league with a code, free.</p>
        <Link href="/runitback/leagues" className={linkCta}>
          Join a league
        </Link>
      </Shell>
    );
  }

  if (await hasPass(me.id)) {
    return (
      <Shell>
        <p className="text-[1.05rem] leading-relaxed">You&apos;ve got the Season Pass for this season. Start your own leagues from the Run It Back Picks app.</p>
        <Link href="/runitback/leagues" className={linkCta}>
          Your leagues
        </Link>
      </Shell>
    );
  }

  if (done === "1") {
    return (
      <Shell>
        <p className="text-[1.05rem] leading-relaxed">Thanks — your pass is switching on. Give it a few seconds, then refresh.</p>
        <Link href="/runitback/pass" className="self-start text-[0.9rem] text-[var(--color-mute)] underline underline-offset-4 hover:text-[var(--color-bone)]">
          Check again
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,4.5vw,2.2rem)] font-black leading-tight">{PRICE} for the whole season</p>
      <section className="flex flex-col gap-3">
        <Label>What it does</Label>
        <ul className="flex flex-col gap-1 text-[0.95rem]">
          <li className="ml-5 list-disc">Start your own leagues, up to 10.</li>
          <li className="ml-5 list-disc">More perks as the season goes.</li>
        </ul>
      </section>
      <PassBuyButton />
      <p className="text-[0.85rem] text-[var(--color-mute)]">
        One-time, no renewal. Questions: see{" "}
        <Link href="/runitback/support" className="underline underline-offset-4 hover:text-[var(--color-bone)]">
          Support
        </Link>
        .
      </p>
    </Shell>
  );
}
