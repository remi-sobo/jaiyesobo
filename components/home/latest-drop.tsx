import Link from "next/link";
import { latestPost } from "@/lib/content/posts";
import { formatDate, pad } from "@/lib/content/format";
import { HandNote, SectionLabel } from "@/components/site/type";

export default function LatestDrop() {
  const post = latestPost();
  const meta = [
    { label: "Posted", value: formatDate(post.date) },
    { label: "Topic", value: post.topic },
    { label: "Read", value: `${post.readMinutes} min` },
  ];

  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel>Latest Drop</SectionLabel>

        <Link
          href={`/column/${post.slug}`}
          className="mt-8 grid gap-[clamp(24px,4vw,64px)] border border-[var(--color-line)] p-[clamp(24px,3vw,44px)] transition-[border-color,transform] duration-300 hover:-translate-y-[3px] hover:border-[var(--color-line-hover)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]"
        >
          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
              On The Court · The Column · No. {pad(post.number)}
            </div>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.4vw,3.6rem)] font-black leading-[0.92] tracking-[-0.03em] text-pretty">
              Ja to the Blazers.
              <br />
              Bad move on the{" "}
              <em className="font-normal italic text-[var(--color-red)]">
                Grizzlies&apos; part?
              </em>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              Portland got an All-Star for Jerami Grant and Kris Murray. I&apos;m a
              Blazers fan, so yeah, I&apos;m happy.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            {meta.map((m) => (
              <div
                key={m.label}
                className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] py-3"
              >
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  {m.label}
                </span>
                <span className="text-[0.95rem]">{m.value}</span>
              </div>
            ))}
            <span className="mt-5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
              Read it ↗
            </span>
          </div>
        </Link>

        <HandNote className="mt-8">Dad thinks this take is crazy.</HandNote>
      </div>
    </section>
  );
}
