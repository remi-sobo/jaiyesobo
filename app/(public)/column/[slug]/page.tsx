import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, publishedPosts, visiblePosts } from "@/lib/content/posts";
import { formatDate, pad } from "@/lib/content/format";
import { Accent } from "@/components/site/type";
import ArticleBody from "@/components/site/article-body";
import ReadingProgress from "@/components/site/reading-progress";
import CopyLink from "@/components/column/copy-link";
import Image from "next/image";

export function generateStaticParams() {
  return visiblePosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  props: PageProps<"/column/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found · Jaiye Sobo" };
  return {
    title: `${post.title} · The Column`,
    description: post.standfirst,
  };
}

/**
 * Where a reader goes next. The newest piece points at the podcast, since
 * that's where the same take gets argued out loud. Everything older points
 * back into the column.
 */
function crossLink(slug: string) {
  const published = publishedPosts();
  const i = published.findIndex((p) => p.slug === slug);

  if (i === 0) {
    return { href: "/pod", label: "We talked about this on the pod" };
  }

  const older = published[i + 1];
  if (older) {
    return { href: `/column/${older.slug}`, label: `Before this: ${older.title}` };
  }

  const latest = published[0];
  if (latest && latest.slug !== slug) {
    return { href: `/column/${latest.slug}`, label: `Latest: ${latest.title}` };
  }
  return null;
}

export default async function PostPage(props: PageProps<"/column/[slug]">) {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) notFound();

  const cross = crossLink(slug);
  const published = publishedPosts();
  const at = published.findIndex((p) => p.slug === slug);
  const newer = at > 0 ? published[at - 1] : undefined;
  const older = at >= 0 ? published[at + 1] : undefined;
  const others = published.filter((p) => p.slug !== slug);

  return (
    <main className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
      <ReadingProgress targetId="column-article" />
      <article id="column-article" className="mx-auto flex max-w-[660px] flex-col">
        <Link
          href="/column"
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] transition-colors duration-300 hover:text-[var(--color-bone)]"
        >
          ← The Column
        </Link>

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em]">
          <span className="text-[var(--color-red)]">
            No. {pad(post.number)} · {formatDate(post.date)}
          </span>
          <span className="text-[var(--color-mute)]">{post.topic}</span>
          <span className="text-[var(--color-mute)]">{post.readMinutes} min</span>
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,6vw,4.2rem)] font-black leading-[0.92] tracking-[-0.035em] text-pretty">
          <Accent text={post.title} accent={post.titleAccent} />
        </h1>

        <p className="mt-7 font-[family-name:var(--font-fraunces)] text-[1.2rem] italic leading-[1.45] text-[var(--color-mute)]">
          {post.standfirst}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--color-line-strong)] py-4">
          <div className="flex items-center gap-3">
            <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[var(--color-line-strong)]">
              <Image src="/jaiye-about.jpg" alt="" fill sizes="44px" className="object-cover" />
            </span>
            <div>
              <div className="text-[0.95rem] font-semibold">By Jaiye Sobo</div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                Age 9 · East Palo Alto · {post.readMinutes} min read
              </div>
            </div>
          </div>
          <CopyLink />
        </div>

        {post.myTake && (
          <div className="mt-10 border-l-2 border-[var(--color-red)] pl-6">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
              My take
            </div>
            <p className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(1.4rem,3vw,1.9rem)] font-black leading-[1.15] tracking-[-0.025em] text-pretty">
              {post.myTake}
            </p>
          </div>
        )}

        <div className="mt-12">
          <ArticleBody blocks={post.body} lead />
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-7 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          <span>Written by Jaiye Sobo · Age 9</span>
          {cross && cross.href === "/pod" && (
            <Link href={cross.href} className="text-[var(--color-red)]">
              {cross.label} ↗
            </Link>
          )}
        </footer>
      </article>

      <nav aria-label="More columns" className="mx-auto mt-[clamp(48px,7vw,88px)] max-w-[960px]">
        {(older || newer) && (
          <div className="grid gap-px bg-[var(--color-line-strong)] sm:grid-cols-2">
            {[
              { post: older, label: "← The one before" },
              { post: newer, label: "The next one →" },
            ].map(({ post: p, label }) =>
              p ? (
                <Link
                  key={label}
                  href={`/column/${p.slug}`}
                  className="group bg-[var(--color-black)] p-[clamp(20px,3vw,32px)] transition-colors hover:bg-[var(--color-off-black)]"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
                    {label}
                  </div>
                  <div className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(1.25rem,2.4vw,1.6rem)] font-black leading-[1.05] tracking-[-0.02em] text-pretty">
                    <Accent text={p.title} accent={p.titleAccent} />
                  </div>
                  <div className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                    No. {pad(p.number)} · {p.topic} · {p.readMinutes} min
                  </div>
                </Link>
              ) : (
                <div key={label} className="hidden bg-[var(--color-black)] sm:block" />
              ),
            )}
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-[clamp(36px,5vw,56px)]">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,3vw,2.2rem)] font-black leading-none tracking-[-0.03em]">
                Keep <em className="font-normal italic text-[var(--color-red)]">reading.</em>
              </h2>
              <Link
                href="/column#all"
                className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
              >
                All {published.length} columns ↗
              </Link>
            </div>
            <ul className="mt-5 list-none">
              {others.map((p) => (
                <li key={p.slug} className="border-t border-[var(--color-line-strong)]">
                  <Link
                    href={`/column/${p.slug}`}
                    className="group grid grid-cols-[minmax(0,52px)_minmax(0,1fr)] items-baseline gap-4 py-4"
                  >
                    <span className="font-[family-name:var(--font-fraunces)] text-[1.5rem] font-black leading-none text-[var(--color-line-hover)] transition-colors group-hover:text-[var(--color-red)]">
                      {pad(p.number)}
                    </span>
                    <span>
                      <span className="block font-[family-name:var(--font-fraunces)] text-[1.15rem] font-black leading-[1.15] tracking-[-0.02em] text-pretty">
                        {p.title}
                      </span>
                      <span className="mt-1 block font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                        {p.topic} · {formatDate(p.date)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </main>
  );
}
