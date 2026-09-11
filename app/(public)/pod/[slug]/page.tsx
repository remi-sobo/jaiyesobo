import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { episodes, getEpisode } from "@/lib/content/episodes";
import { getVaultEntry } from "@/lib/content/vault";
import { formatDate, pad } from "@/lib/content/format";
import { Accent, Badge, SectionLabel } from "@/components/site/type";
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
              EP.{pad(ep.number)} · {formatDate(ep.date)} · {ep.runtime} · {ep.guests}
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,5vw,3.6rem)] font-black leading-[0.92] tracking-[-0.035em] text-pretty">
              <Accent text={ep.title} accent={ep.titleAccent} />
            </h1>
          </div>
        </header>

        <p className="mt-8 font-[family-name:var(--font-fraunces)] text-[1.2rem] italic leading-[1.45] text-[var(--color-mute)]">
          {ep.standfirst}
        </p>

        <div className="mt-10 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-2">
          <div className="relative aspect-video w-full">
            <iframe
              className="absolute inset-0 h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${ep.youtubeId}`}
              title={ep.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

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

        <section id="chapters" className="mt-16 scroll-mt-24">
          <SectionLabel>Chapters</SectionLabel>
          <ul className="mt-6 list-none">
            {ep.chapters.map((c) => (
              <li
                key={c.time}
                className="grid grid-cols-[minmax(0,68px)_minmax(0,1fr)] gap-4 border-t border-[var(--color-line)] py-4"
              >
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] tracking-[0.05em] text-[var(--color-red)]">
                  {c.time}
                </span>
                <p className="text-[1.05rem] leading-[1.7] text-pretty">
                  {c.segment && (
                    <>
                      <Badge>{c.segment}</Badge>{" "}
                    </>
                  )}
                  {c.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

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
