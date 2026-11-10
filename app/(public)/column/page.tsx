import type { Metadata } from "next";
import Link from "next/link";
import { visiblePosts } from "@/lib/content/posts";
import { schedule } from "@/lib/content/publishing";
import { formatDate, pad } from "@/lib/content/format";
import { Accent, SectionLabel } from "@/components/site/type";
import ColumnList, { type ColumnRow } from "@/components/column/column-list";

export const metadata: Metadata = {
  title: "The Column · Jaiye Sobo",
  description:
    "I pick one thing that happened in basketball and I say what I think about it. New writing throughout the season.",
};

export default function ColumnPage() {
  const posts = visiblePosts();
  const lead = posts.find((p) => p.status === "published");
  const rows: ColumnRow[] = posts.map((p) => ({
    slug: p.slug,
    number: pad(p.number),
    title: p.title,
    titleAccent: p.titleAccent,
    summary: p.dek ?? p.standfirst,
    topic: p.topic,
    date: formatDate(p.date),
    readMinutes: p.readMinutes,
    isDraft: p.status === "draft",
  }));
  const published = rows.filter((r) => !r.isDraft).length;

  return (
    <main>
      <section className="px-5 pt-[clamp(44px,6vw,88px)] min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>On The Court</SectionLabel>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
            The <em className="font-normal italic text-[var(--color-red)]">Column.</em>
          </h1>
          <p className="mt-6 max-w-[48ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            I pick one thing that happened in basketball and I say what I think about
            it. New writing throughout the season.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            <span>By Jaiye Sobo · Age 9</span>
            <span className="text-[var(--color-red)]">{published} columns so far</span>
            <a href="#all" className="hover:text-[var(--color-bone)]">
              Jump to all of them ↓
            </a>
          </div>
        </div>
      </section>

      {lead && (
        <section className="px-5 py-[clamp(36px,5vw,64px)] min-[760px]:px-10">
          <div className="mx-auto max-w-[1200px]">
            <Link
              href={`/column/${lead.slug}`}
              className="group block border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-[clamp(24px,4vw,56px)] transition-colors duration-300 hover:border-[var(--color-red)]"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em]">
                <span className="bg-[var(--color-red)] px-2 py-1 text-[var(--color-black)]">New</span>
                <span className="text-[var(--color-red)]">No. {pad(lead.number)} · {lead.topic}</span>
                <span className="text-[var(--color-mute)]">
                  {formatDate(lead.date)} · {lead.readMinutes} min read
                </span>
              </div>
              <h2 className="mt-6 max-w-[18ch] font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,6.4vw,5rem)] font-black leading-[0.9] tracking-[-0.04em] text-pretty">
                <Accent text={lead.title} accent={lead.titleAccent} />
              </h2>
              <p className="mt-6 max-w-[56ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.1rem,2vw,1.35rem)] italic leading-[1.45] text-[var(--color-mute)]">
                {lead.standfirst}
              </p>
              <span className="mt-8 inline-flex min-h-12 items-center bg-[var(--color-red)] px-[26px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors duration-300 group-hover:bg-[var(--color-bone)]">
                Read the new one ↗
              </span>
            </Link>
          </div>
        </section>
      )}

      <section id="all" className="scroll-mt-24 px-5 min-[760px]:px-10">
        <div className="mx-auto max-w-[1200px]">
          <SectionLabel>Every column</SectionLabel>
          <div className="mt-6">
            <ColumnList rows={rows} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line-strong)] py-8 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
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
