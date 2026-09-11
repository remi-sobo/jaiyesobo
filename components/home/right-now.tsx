import Link from "next/link";
import { homeRows, now } from "@/lib/content/now";
import { formatDate } from "@/lib/content/format";
import { Accent, SectionLabel } from "@/components/site/type";

export default function RightNow() {
  return (
    <section className="border-t border-[var(--color-line)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto grid max-w-[1200px] gap-[clamp(24px,4vw,56px)] lg:grid-cols-3">
        <div>
          <SectionLabel>Right now</SectionLabel>
          <h2 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.4vw,3.2rem)] font-black leading-[0.95] tracking-[-0.03em]">
            What I&apos;m <em className="font-normal italic text-[var(--color-red)]">on.</em>
          </h2>
          <p className="mt-5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Updated {formatDate(now.updatedAt)}
          </p>
          <Link
            href="/now"
            className="mt-6 inline-block font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]"
          >
            The whole list ↗
          </Link>
        </div>

        <div className="lg:col-span-2">
          {homeRows().map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 border-t border-[var(--color-line)] py-6 first:border-t-0 first:pt-0"
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
      </div>
    </section>
  );
}
