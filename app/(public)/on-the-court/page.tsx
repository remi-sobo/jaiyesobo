import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { episodeMeta, episodes, latestEpisode } from "@/lib/content/episodes";
import { latestPost, publishedPosts } from "@/lib/content/posts";
import { formatDate, pad } from "@/lib/content/format";
import { Accent, SectionLabel } from "@/components/site/type";
import { GhostButton, PlayButton } from "@/components/site/buttons";
import { InstagramLine } from "@/components/site/instagram";
import Shorts from "@/components/home/shorts";
import Reveal from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "On The Court · Jaiye Sobo",
  description: "Everything I say about basketball. Watch the show or read the column.",
};

const door = "flex h-full flex-col border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-[clamp(20px,3vw,40px)]";
const kicker = "font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]";
const doorTitle = "mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4vw,3rem)] font-black leading-[0.95] tracking-[-0.03em]";

/** One name, two doors: the show you watch and the column you read. */
export default function OnTheCourtPage() {
  const ep = latestEpisode();
  const post = latestPost();

  return (
    <main>
      <section className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>By Jaiye Sobo · Age 9</SectionLabel>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
            On The <em className="font-normal italic text-[var(--color-red)]">Court.</em>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            Everything I say about basketball. Watch the show or read the column.
          </p>
          <InstagramLine className="mt-6">Follow On The Court on Instagram:</InstagramLine>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] px-5 py-[clamp(40px,6vw,88px)] min-[760px]:px-10">
        <div className="mx-auto grid max-w-[1200px] gap-[clamp(20px,3vw,40px)] lg:grid-cols-2">
          <div className={door}>
            <div className={kicker}>Watch · {episodes.length} episodes</div>
            <h2 className={doorTitle}>The Show</h2>
            <Link
              href={`/pod/${ep.slug}`}
              className="mt-6 flex items-center gap-5 border border-[var(--color-line)] p-4 transition-colors duration-300 hover:border-[var(--color-red)]"
            >
              <span className="relative block aspect-square w-[96px] shrink-0 overflow-hidden border border-[var(--color-line-strong)]">
                <Image src="/on-the-court-cover.png" alt="" fill sizes="96px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  Newest · EP.{pad(ep.number)} · {episodeMeta(ep)}
                </span>
                <span className="mt-2 block font-[family-name:var(--font-fraunces)] text-[1.35rem] font-black leading-[1.1] tracking-[-0.02em] text-pretty">
                  <Accent text={ep.title} accent={ep.titleAccent} />
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">{ep.standfirst}</p>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <PlayButton href={`/pod/${ep.slug}`}>Play episode</PlayButton>
              <GhostButton href="/pod#episodes">All episodes</GhostButton>
            </div>
          </div>

          <div className={door}>
            <div className={kicker}>Read · {publishedPosts().length} columns</div>
            <h2 className={doorTitle}>The Column</h2>
            <Link
              href={`/column/${post.slug}`}
              className="mt-6 block border border-[var(--color-line)] p-4 transition-colors duration-300 hover:border-[var(--color-red)]"
            >
              <span className="block font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                Newest · No. {pad(post.number)} · {formatDate(post.date)} · {post.readMinutes} min read
              </span>
              <span className="mt-2 block font-[family-name:var(--font-fraunces)] text-[1.35rem] font-black leading-[1.1] tracking-[-0.02em] text-pretty">
                <Accent text={post.title} accent={post.titleAccent} />
              </span>
            </Link>
            <p className="mt-5 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">{post.dek ?? post.standfirst}</p>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <PlayButton href={`/column/${post.slug}`}>Read it</PlayButton>
              <GhostButton href="/column#all">All columns</GhostButton>
            </div>
          </div>
        </div>
      </section>

      <Reveal>
        <Shorts />
      </Reveal>
    </main>
  );
}
