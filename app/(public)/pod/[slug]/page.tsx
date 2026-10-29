import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ArticleBody from "@/components/site/article-body";
import EpisodePlayer from "@/components/site/episode-player";
import { notFound } from "next/navigation";
import { episodeMeta, episodes, getEpisode } from "@/lib/content/episodes";
import { getVaultEntry } from "@/lib/content/vault";
import { pad } from "@/lib/content/format";
import { Accent, SectionLabel } from "@/components/site/type";
import { VaultCompact } from "@/components/site/vault";

export function generateStaticParams() {
  return episodes.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata(
  props: PageProps<"/pod/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const ep = getEpisode(slug);
  if (!ep) return { title: "Episode not found · Jaiye Sobo" };
  return {
    title: `${ep.title} · On The Court`,
    description: ep.standfirst,
  };
}

export default async function EpisodePage(props: PageProps<"/pod/[slug]">) {
  const { slug } = await props.params;
  const ep = getEpisode(slug);
  if (!ep) notFound();

  const vault = ep.vaultId ? getVaultEntry(ep.vaultId) : undefined;

  return (
    <main className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
      <article className="mx-auto max-w-[760px]">
        <Link
          href="/pod"
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] transition-colors duration-300 hover:text-[var(--color-bone)]"
        >
          ← On The Court
        </Link>

        <header className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:items-start">
          <div className="relative aspect-square w-full max-w-[240px] overflow-hidden border border-[var(--color-line-strong)]">
            <Image
              src="/on-the-court-cover.png"
              alt="Jaiye's On The Court podcast cover art"
              fill
              sizes="240px"
              className="object-cover"
              priority
            />
          </div>

          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
              EP.{pad(ep.number)} · {episodeMeta(ep)}
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,5vw,3.6rem)] font-black leading-[0.92] tracking-[-0.035em] text-pretty">
              <Accent text={ep.title} accent={ep.titleAccent} />
            </h1>
          </div>
        </header>

        <p className="mt-8 font-[family-name:var(--font-fraunces)] text-[1.2rem] italic leading-[1.45] text-[var(--color-mute)]">
          {ep.standfirst}
        </p>

        <EpisodePlayer youtubeId={ep.youtubeId} title={ep.title} chapters={ep.chapters} />

        {ep.audioUrl && (
          <audio controls preload="none" src={ep.audioUrl} className="mt-4 w-full">
            Your browser doesn&apos;t support audio playback.
          </audio>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Recorded at the kitchen table, East Palo Alto
          </span>
          <a
            href={`https://youtu.be/${ep.youtubeId}`}
            target="_blank"
            rel="noreferrer"
            className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]"
          >
            Watch on YouTube ↗
          </a>
        </div>

        {ep.article ? (
          <section id="article" className="mt-16 scroll-mt-24">
            <SectionLabel tone="red">The article</SectionLabel>
            {ep.myTake ? (
              <div className="mt-8 border-l-2 border-[var(--color-red)] pl-6">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
                  My take
                </div>
                <p className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(1.4rem,3vw,1.9rem)] font-black leading-[1.15] tracking-[-0.025em] text-pretty">
                  {ep.myTake}
                </p>
              </div>
            ) : null}
            <div className="mt-10">
              <ArticleBody blocks={ep.article} />
            </div>
          </section>
        ) : null}

        {vault && (
          <div className="mt-16">
            <VaultCompact entry={vault} />
          </div>
        )}

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-7 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          <span>Jaiye Sobo with his dad</span>
          <Link href="/column" className="text-[var(--color-red)]">
            Read the column too ↗
          </Link>
        </footer>
      </article>
    </main>
  );
}
