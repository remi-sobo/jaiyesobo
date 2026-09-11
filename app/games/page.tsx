import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { games, GAME_STATUS_LABEL, featuredGame } from "@/lib/content/games";
import { Accent, HandNote, SectionLabel } from "@/components/site/type";
import { PlayButton } from "@/components/site/buttons";
import { pad2 } from "@/lib/content/format";

export const metadata: Metadata = {
  title: "Play something I made · Jaiye Sobo",
  description:
    "Basketball games Jaiye came up with. He decides how they work, then he and his dad build them.",
  openGraph: {
    title: "Jaiye's Games",
    description: "Basketball games made by Jaiye Sobo, age 9.",
    type: "website",
  },
};

export default function GamesPage() {
  const featured = featuredGame();
  const rest = games.filter((g) => g.slug !== featured.slug);

  return (
    <>
      <Nav />
      <main>
        <section className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <SectionLabel tone="yellow">Made by Jaiye</SectionLabel>
            <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
              Play something
              <br />
              <em className="font-normal italic text-[var(--color-red)]">I made.</em>
            </h1>
            <p className="mt-6 max-w-[48ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              These are basketball games I came up with. I decide how they work and
              what the rules are, then me and my dad build them.
            </p>
          </div>
        </section>

        <section className="px-5 min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-[clamp(24px,4vw,56px)] border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-[clamp(24px,3vw,44px)] lg:grid-cols-2 lg:items-center">
              <div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)]">
                  Game {pad2(featured.number)} ·{" "}
                  {GAME_STATUS_LABEL[featured.status]}
                </div>
                <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.4vw,3.2rem)] font-black leading-[0.95] tracking-[-0.03em]">
                  <Accent text={featured.title} accent={featured.titleAccent} />
                </h2>
                <p className="mt-5 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
                  {featured.description}
                </p>
                {featured.href && (
                  <div className="mt-8">
                    <PlayButton href={featured.href} tone="yellow">
                      Play
                    </PlayButton>
                  </div>
                )}
                {featured.credit && (
                  <p className="mt-5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                    {featured.credit}
                  </p>
                )}
                <HandNote className="mt-6">
                  I thought this would be easier to build.
                </HandNote>
              </div>

              {featured.screenshot && (
                <div className="relative aspect-[16/10] w-full overflow-hidden border border-[var(--color-line-strong)]">
                  <Image
                    src={featured.screenshot}
                    alt="A round of Blind Rank in progress"
                    fill
                    sizes="(max-width: 1024px) 100vw, 560px"
                    className="object-cover object-left-top"
                    priority
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-px bg-[var(--color-line-strong)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              {rest.map((g) => (
                <div key={g.slug} className="bg-[var(--color-black)] p-6">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                    Game {pad2(g.number)} · {GAME_STATUS_LABEL[g.status]}
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-black leading-tight tracking-[-0.02em]">
                    {g.title}
                  </h3>
                  <p className="mt-3 text-[0.95rem] leading-[1.6] text-[var(--color-mute)]">
                    {g.description}
                  </p>
                </div>
              ))}

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
