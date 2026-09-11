import type { Metadata } from "next";
import { now } from "@/lib/content/now";
import { formatDate, formatShortDate } from "@/lib/content/format";
import { Accent, HandNote, SectionLabel } from "@/components/site/type";

export const metadata: Metadata = {
  title: "Right now · Jaiye Sobo",
  description: "What I'm working on, watching, reading and arguing about.",
};

function Rows({ rows }: { rows: typeof now.onCourt }) {
  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-4 border-t border-[var(--color-line)] py-6"
        >
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            {row.label}
          </span>
          <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1.3rem,2.4vw,2rem)] leading-tight tracking-[-0.02em] text-pretty">
            <Accent text={row.value} accent={row.accent} />
          </p>
        </div>
      ))}
    </div>
  );
}

export default function NowPage() {
  return (
    <main className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          Updated {formatDate(now.updatedAt)}
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
          Right <em className="font-normal italic text-[var(--color-red)]">now.</em>
        </h1>

        <HandNote className="mt-7">
          This changes a lot. That&apos;s kind of the point.
        </HandNote>

        <div className="mt-[clamp(40px,6vw,80px)]">
          <SectionLabel tone="red">On the court</SectionLabel>
          <div className="mt-6">
            <Rows rows={now.onCourt} />
          </div>
        </div>

        <div className="mt-[clamp(40px,6vw,80px)]">
          <SectionLabel tone="red">Off the court</SectionLabel>
          <div className="mt-6">
            <Rows rows={now.offCourt} />
          </div>
        </div>

        <div className="mt-[clamp(40px,6vw,80px)]">
          <SectionLabel>Books I&apos;ve finished</SectionLabel>
          <div className="mt-6 grid gap-px bg-[var(--color-line-strong)]">
            {now.books.map((b) => (
              <div
                key={b.title}
                className="grid gap-3 bg-[var(--color-black)] p-6 sm:grid-cols-3 sm:items-baseline"
              >
                <h3 className="font-[family-name:var(--font-fraunces)] text-[1.4rem] font-black leading-tight tracking-[-0.02em]">
                  {b.title}
                </h3>
                <p className="text-[1rem] leading-[1.6] text-[var(--color-mute)]">
                  {b.reaction}
                </p>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)] sm:text-right">
                  {formatShortDate(b.finishedOn)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Next up: {now.nextBook}
          </p>
        </div>
      </div>
    </main>
  );
}
