import Image from "next/image";
import Link from "next/link";
import { latestEpisode } from "@/lib/content/episodes";
import { schedule } from "@/lib/content/publishing";
import { formatDate, formatShortDate, pad } from "@/lib/content/format";
import { SectionLabel } from "@/components/site/type";
import { GhostButton, PlayButton } from "@/components/site/buttons";

export default function OnTheCourt() {
  const ep = latestEpisode();

  // The one publishing-status surface on the homepage. Every value comes
  // from the schedule record, so it can't drift from /pod or /now.
  const strip = [
    { label: "In the studio", value: schedule.inStudio, accent: "Blazers preview" },
    {
      label: "Next release",
      value: `${schedule.nextRelease} · ${formatShortDate(schedule.nextReleaseDate)}`,
      accent: formatShortDate(schedule.nextReleaseDate),
    },
    {
      label: "Next column",
      value: schedule.nextColumnTopic,
      accent: "actually matter",
    },
  ];

  return (
    <section className="border-t border-[var(--color-line)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-[clamp(24px,4vw,64px)] lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>The Podcast</SectionLabel>

            <h2 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,5.6vw,4.4rem)] font-black leading-[0.9] tracking-[-0.04em]">
              Jaiye&apos;s On
              <br />
              The <em className="font-normal italic text-[var(--color-red)]">Court.</em>
            </h2>

            <div className="mt-8 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
              EP.{pad(ep.number)} · {formatDate(ep.date)} · {ep.runtime} · {ep.guests}
            </div>

            <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(1.5rem,3vw,2.1rem)] font-black leading-[1.05] tracking-[-0.025em] text-pretty">
              {ep.title}
            </h3>

            <p className="mt-4 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              Giannis to Miami, LeBron to Philly, Ja to Portland. Then I put every
              prediction I&apos;ve got in the vault.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PlayButton href={`/pod/${ep.slug}`}>Play episode</PlayButton>
              <GhostButton href="/pod">All episodes</GhostButton>
            </div>
          </div>

          <div>
            <Link
              href={`/pod/${ep.slug}`}
              className="relative block aspect-square w-full max-w-[420px] overflow-hidden border border-[var(--color-line-strong)] transition-colors duration-300 hover:border-[var(--color-red)]"
            >
              <Image
                src="/on-the-court-cover.png"
                alt="Jaiye's On The Court podcast cover art"
                fill
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover"
              />
            </Link>
            <p className="mt-4 max-w-[420px] font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
              Jaiye Sobo with his dad · East Palo Alto
            </p>
          </div>
        </div>

        <div className="mt-[clamp(32px,5vw,64px)] grid gap-px bg-[var(--color-line-strong)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          {strip.map((s) => {
            const at = s.value.indexOf(s.accent);
            return (
              <div key={s.label} className="bg-[var(--color-black)] p-6">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                  {s.label}
                </div>
                <p className="mt-3 font-[family-name:var(--font-fraunces)] text-[1.15rem] font-black leading-tight tracking-[-0.02em]">
                  {at === -1 ? (
                    s.value
                  ) : (
                    <>
                      {s.value.slice(0, at)}
                      <em className="font-normal italic text-[var(--color-red)]">
                        {s.accent}
                      </em>
                      {s.value.slice(at + s.accent.length)}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
