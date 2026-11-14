import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { episodeMeta, episodes, latestEpisode, SEGMENTS } from "@/lib/content/episodes";
import { getVaultEntry } from "@/lib/content/vault";
import { schedule } from "@/lib/content/publishing";
import { formatShortDate, pad } from "@/lib/content/format";
import { Accent, Badge, SectionLabel } from "@/components/site/type";
import { GhostButton, PlayButton } from "@/components/site/buttons";
import { VaultSection } from "@/components/site/vault";
import Reveal from "@/components/site/reveal";
import { InstagramLine } from "@/components/site/instagram";
import NewsletterBox from "@/components/site/newsletter-box";

export const metadata: Metadata = {
  title: "On The Court · Jaiye Sobo",
  description:
    "Me and my dad talking basketball for about twenty minutes. New episodes throughout the season.",
};

export default function PodPage() {
  const ep = latestEpisode();
  const vault = ep.vaultId ? getVaultEntry(ep.vaultId) : undefined;

  return (
    <main>
      <section className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>The Podcast</SectionLabel>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
            On The <em className="font-normal italic text-[var(--color-red)]">Court.</em>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            Me and my dad talking basketball for about twenty minutes. New episodes
            throughout the season.
          </p>
          <InstagramLine className="mt-6">Follow the show on Instagram:</InstagramLine>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
        <div className="mx-auto grid max-w-[1200px] gap-[clamp(24px,4vw,56px)] lg:grid-cols-3">
          <div className="w-full max-w-[400px] lg:max-w-none">
            <Link
              href={`/pod/${ep.slug}`}
              className="group relative block aspect-square w-full overflow-hidden border border-[var(--color-line-strong)] transition-colors duration-300 hover:border-[var(--color-red)]"
            >
              <Image
                src="/on-the-court-cover.png"
                alt="Jaiye's On The Court podcast cover art"
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
                priority
              />
            </Link>

            <div className="mt-px grid gap-px bg-[var(--color-line-strong)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[var(--color-black)] px-4 py-4">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  In the studio
                </span>
                <span className="text-[0.9rem] text-[var(--color-bone)]">
                  {schedule.inStudio}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[var(--color-black)] px-4 py-4">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  Next release
                </span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-red)]">
                  {formatShortDate(schedule.nextReleaseDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
              Latest episode
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <span className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4vw,2.6rem)] font-black leading-none tracking-[-0.03em]">
                EP.{pad(ep.number)}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                {episodeMeta(ep)}
              </span>
            </div>

            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4.4vw,3.2rem)] font-black leading-[0.95] tracking-[-0.035em] text-pretty">
              <Accent text={ep.title} accent={ep.titleAccent} />
            </h2>

            <p className="mt-5 max-w-[52ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              {ep.standfirst}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PlayButton href={`/pod/${ep.slug}`}>Play episode</PlayButton>
              {ep.chapters.length ? <GhostButton href={`/pod/${ep.slug}#chapters`}>Chapters</GhostButton> : null}
            </div>

            <div className="mt-12 flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <p className="mt-4 text-[0.9rem] text-[var(--color-mute)]">
              The segments that come back every episode.
            </p>
          </div>
        </div>
      </section>

      <section id="episodes" className="scroll-mt-24 border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>Every episode</SectionLabel>
          <h2 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.6vw,3.4rem)] font-black leading-[0.92] tracking-[-0.035em]">
            All {episodes.length} <em className="font-normal italic text-[var(--color-red)]">episodes.</em>
          </h2>

          <ul className="mt-[clamp(28px,4vw,48px)] list-none">
            {episodes.map((e) => (
              <li key={e.slug} className="border-t border-[var(--color-line-strong)]">
                <Link
                  href={`/pod/${e.slug}`}
                  className="group grid gap-5 py-6 transition-colors hover:bg-[var(--color-black)] sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:items-center sm:gap-8 sm:px-3"
                >
                  <div className="relative aspect-video w-full overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-black)] transition-colors duration-300 group-hover:border-[var(--color-red)]">
                    <Image
                      src={`https://i.ytimg.com/vi/${e.youtubeId}/hqdefault.jpg`}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 240px"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-red)] transition-transform duration-300 group-hover:scale-110">
                        <span aria-hidden className="ml-1 h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[var(--color-black)]" />
                      </span>
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="font-[family-name:var(--font-fraunces)] text-[1.5rem] font-black leading-none tracking-[-0.03em]">
                        EP.{pad(e.number)}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                        {episodeMeta(e)}
                      </span>
                      {e.slug === ep.slug && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                          Latest
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(1.35rem,2.6vw,1.9rem)] font-black leading-[1.05] tracking-[-0.025em] text-pretty">
                      <Accent text={e.title} accent={e.titleAccent} />
                    </h3>
                    <p className="mt-2 max-w-[60ch] text-[0.95rem] leading-[1.6] text-[var(--color-mute)]">
                      {e.standfirst}
                    </p>
                    <span className="mt-3 inline-block font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                      Watch it ↗
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] px-5 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <NewsletterBox className="max-w-[640px]" />
        </div>
      </section>

      {vault && (
        <Reveal>
          <VaultSection entry={vault} />
        </Reveal>
      )}
    </main>
  );
}
