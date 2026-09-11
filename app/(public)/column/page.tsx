import type { Metadata } from "next";
import Link from "next/link";
import { visiblePosts } from "@/lib/content/posts";
import { schedule } from "@/lib/content/publishing";
import { formatDate, pad } from "@/lib/content/format";
import { SectionLabel } from "@/components/site/type";

export const metadata: Metadata = {
  title: "The Column · Jaiye Sobo",
  description:
    "I pick one thing that happened in basketball and I say what I think about it. New writing throughout the season.",
};

export default function ColumnPage() {
  const posts = visiblePosts();

  return (
    <main>
      <section className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>On The Court</SectionLabel>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
            The <em className="font-normal italic text-[var(--color-red)]">Column.</em>
          </h1>
          <p className="mt-6 max-w-[48ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            I pick one thing that happened in basketball and I say what I think about
            it. New writing throughout the season.
          </p>
        </div>
      </section>

      <section className="px-5 min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-px bg-[var(--color-line-strong)]">
            {posts.map((post) => {
              const isDraft = post.status === "draft";
              const row = (
                <div
                  className={`grid gap-[clamp(16px,3vw,48px)] bg-[var(--color-black)] p-[clamp(24px,3vw,40px)] transition-colors duration-300 lg:grid-cols-3 ${
                    isDraft ? "opacity-60" : "hover:bg-[var(--color-off-black)]"
                  }`}
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase leading-relaxed tracking-[0.2em]">
                    <div className="text-[var(--color-red)]">
                      {isDraft
                        ? `Draft · No. ${pad(post.number)}`
                        : `No. ${pad(post.number)} · ${formatDate(post.date)}`}
                    </div>
                    <div className="mt-2 text-[var(--color-mute)]">
                      {post.topic} · {isDraft ? "Preseason" : `${post.readMinutes} min`}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.7rem,3.4vw,2.6rem)] font-black leading-[0.98] tracking-[-0.025em] text-pretty">
                      {post.title}
                    </h2>
                    <p className="mt-4 max-w-[58ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
                      {post.dek ?? post.standfirst}
                    </p>
                  </div>
                </div>
              );

              // A draft has nowhere to go yet, so it isn't a link.
              return isDraft ? (
                <div key={post.slug}>{row}</div>
              ) : (
                <Link key={post.slug} href={`/column/${post.slug}`} className="block">
                  {row}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 py-8 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            <span>Up next: {schedule.nextColumnTopic}</span>
            <a href="/feed.xml" className="text-[var(--color-red)]">
              RSS ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
