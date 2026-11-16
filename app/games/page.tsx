import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { games, GAME_STATUS_LABEL } from "@/lib/content/games";
import { SectionLabel } from "@/components/site/type";
import PromoVideo from "@/components/sportsbook/public/promo-video";
import { pad2 } from "@/lib/content/format";

export const metadata: Metadata = {
  title: "Play · Jaiye Sobo",
  description:
    "Run It Back Picks, my free NBA picks game, plus the other basketball games I came up with.",
  openGraph: {
    title: "Jaiye's Games",
    description: "Basketball games made by me, Jaiye. I'm 9.",
    type: "website",
  },
};

export default function GamesPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="px-5 pt-[clamp(44px,6vw,88px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <SectionLabel tone="yellow">Made by Jaiye</SectionLabel>
            <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
              Play something
              <br />
              <em className="font-normal italic text-[var(--color-red)]">I made.</em>
            </h1>
            <p className="mt-6 max-w-[48ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              These are basketball games I came up with. I decide how they work and
              what the rules are, then me and my dad build them. Start with the big one.
            </p>
          </div>
        </section>

        {/* The main game, in its own colours. */}
        <section className="runitback-brand px-5 pt-[clamp(32px,5vw,64px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                  The main game · New picks every Monday
                </div>
                <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,5vw,3.6rem)] font-black italic leading-[0.95] tracking-[-0.02em] text-[var(--color-bone)]">
                  Run It Back <span className="text-[var(--color-red)]">Picks</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em]">
                <Link href="/runitback" className="py-1 text-[var(--color-bone)] hover:text-[var(--color-red)]">This week&apos;s picks →</Link>
                <Link href="/runitback/standings" className="py-1 text-[var(--color-bone)] hover:text-[var(--color-red)]">Standings →</Link>
              </div>
            </div>
            <PromoVideo className="mt-6" />
          </div>
        </section>

        <section className="px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <SectionLabel tone="yellow">More games I made</SectionLabel>
            <div className="mt-8 grid gap-px bg-[var(--color-line-strong)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              {games.map((g) => {
                const isLive = g.status === "live" && g.href;
                const toneClass = isLive
                  ? "text-[var(--color-games-yellow)]"
                  : "text-[var(--color-mute)]";
                const inner = (
                  <>
                    <div
                      className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] ${toneClass}`}
                    >
                      Game {pad2(g.number)} · {GAME_STATUS_LABEL[g.status]}
                    </div>
                    <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-black leading-tight tracking-[-0.02em]">
                      {g.title}
                    </h3>
                    <p className="mt-3 text-[0.95rem] leading-[1.6] text-[var(--color-mute)]">
                      {g.description}
                    </p>
                    {isLive && (
                      <div className="mt-4 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
                        Play →
                      </div>
                    )}
                  </>
                );
                if (isLive && g.href) {
                  return (
                    <Link
                      key={g.slug}
                      href={g.href}
                      className="block bg-[var(--color-black)] p-6 transition-colors hover:bg-[var(--color-off-black)]"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div key={g.slug} className="bg-[var(--color-black)] p-6">
                    {inner}
                  </div>
                );
              })}

              <div className="bg-[var(--color-black)] p-6">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  The rule
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-black leading-tight tracking-[-0.02em]">
                  Fun in ten seconds
                </h3>
                <p className="mt-3 text-[0.95rem] leading-[1.6] text-[var(--color-mute)]">
                  If it takes longer than that to figure out, we change it.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
