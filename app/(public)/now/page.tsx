import type { Metadata } from "next";
import Link from "next/link";
import NowStrip from "@/components/now-strip";

export const metadata: Metadata = {
  title: "Now · Jaiye Sobo",
  description: "What I'm into right this minute.",
};

const UPDATED = "April 19";

export default function NowPage() {
  return (
    <>
      <section className="pt-36 pb-8 px-6 lg:px-10 bg-[var(--color-black)]">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] animate-pulse" />
            Right now · Updated {UPDATED}
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-black leading-[0.85] tracking-[-0.045em] text-[clamp(4rem,11vw,10rem)] mb-3">
            No<span className="italic font-normal text-[var(--color-red)]">w</span>.
          </h1>
          <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.1rem,1.6vw,1.5rem)] text-[var(--color-bone)] max-w-[44ch] leading-snug">
            A snapshot. What I&apos;m reading, watching, building, working on.
          </p>
        </div>
      </section>

      <NowStrip />

      <section className="px-6 lg:px-10 py-16 border-t border-[var(--color-line)]">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-mute)] leading-relaxed max-w-[60ch]">
            This page is updated every week or two. If something&apos;s here, I&apos;m actually into it right this minute.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            ← Back home
          </Link>
        </div>
      </section>
    </>
  );
}
