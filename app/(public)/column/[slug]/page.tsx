import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, publishedPosts, visiblePosts } from "@/lib/content/posts";
import { formatDate, pad } from "@/lib/content/format";
import { Accent, HandNote } from "@/components/site/type";

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

  return (
    <main className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
      <article className="mx-auto flex max-w-[660px] flex-col">
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

        <div className="mt-12 flex flex-col gap-[26px]">
          {post.body.map((block, i) => {
            if (block.kind === "p") {
              return (
                <p key={i} className="text-[1.1rem] leading-[1.75] text-pretty">
                  {block.text}
                </p>
              );
            }
            if (block.kind === "pull") {
              return (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-[clamp(20px,3vw,32px)] py-7 font-[family-name:var(--font-fraunces)] text-[clamp(1.3rem,3vw,1.8rem)] font-black leading-[1.25] tracking-[-0.02em]"
                >
                  {block.lines.map((line, j) => (
                    <span
                      key={j}
                      className={
                        block.accentLast && j === block.lines.length - 1
                          ? "text-[var(--color-red)]"
                          : undefined
                      }
                    >
                      {line}
                    </span>
                  ))}
                </div>
              );
            }
            return (
              <HandNote key={i} align="right" className="max-w-[26ch]">
                {block.text}
              </HandNote>
            );
          })}
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-7 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          <span>Written by Jaiye Sobo · Age 9</span>
          {cross && (
            <Link href={cross.href} className="text-[var(--color-red)]">
              {cross.label} ↗
            </Link>
          )}
        </footer>
      </article>
    </main>
  );
}
