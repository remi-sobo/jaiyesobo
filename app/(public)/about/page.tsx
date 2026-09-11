import type { Metadata } from "next";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { HandNote, SectionLabel } from "@/components/site/type";

export const metadata: Metadata = {
  title: "About · Jaiye Sobo",
  description: "I'm Jaiye. I'm nine. I play basketball and I make stuff.",
};

/**
 * Jaiye's words, as he wrote them. Grammar and formatting get cleaned up,
 * the voice does not.
 */
const prose = [
  "I'm in fourth grade. I homeschool, so my school is my house and sometimes the gym.",
  "I play basketball. I wear zero. I'm a guard and I'd rather make the pass than take the shot, most of the time.",
  "I write a column about basketball and I record a podcast called On The Court with my dad. If I have a take, it goes in one of those two places.",
  "I build stuff too. Usually I tell my dad what I want it to do and then we figure out how to make it work.",
  "I like basketball, building things, reading, my family, and Jesus.",
  "If you want to tell me I'm wrong about something, my dad's email is on here and he'll read it to me.",
];

const spec = [
  { label: "Age", value: "9" },
  { label: "Grade", value: "4th" },
  { label: "Jersey", value: "0", accent: true },
  { label: "City", value: "East Palo Alto" },
  { label: "Position", value: "Guard" },
  { label: "Volume", value: "02 · 2026" },
];

const PHOTO = "/jaiye-about.jpg";

/**
 * Drop a candid 4:5 photo at `public/jaiye-about.jpg` and it replaces the
 * empty state below on the next build. Nothing else needs to change.
 */
function Portrait() {
  const hasPhoto = existsSync(path.join(process.cwd(), "public", PHOTO));

  if (!hasPhoto) {
    return (
      <div className="flex aspect-4/5 w-full items-center justify-center border border-dashed border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-6">
        <p className="text-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase leading-relaxed tracking-[0.2em] text-[var(--color-mute)]">
          Photo goes here
          <br />
          public/jaiye-about.jpg
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-4/5 w-full overflow-hidden">
      <Image
        src={PHOTO}
        alt="Jaiye Sobo standing in a rose garden, in a denim jacket over a basketball tee"
        fill
        sizes="(max-width: 1024px) 100vw, 400px"
        className="object-cover"
        priority
      />
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="px-5 py-[clamp(44px,6vw,88px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel>About</SectionLabel>

        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(3rem,8vw,6rem)] font-black leading-[0.85] tracking-[-0.045em]">
          I&apos;m Jaiye.
          <br />
          I&apos;m <em className="font-normal italic text-[var(--color-red)]">nine.</em>
        </h1>

        <div className="mt-[clamp(40px,6vw,80px)] grid gap-[clamp(24px,4vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div className="flex flex-col gap-6">
            {prose.map((p) => (
              <p key={p} className="max-w-[60ch] text-[1.1rem] leading-[1.75] text-pretty">
                {p}
              </p>
            ))}
            <HandNote className="mt-2">
              I still think I&apos;m right about the Blazers though.
            </HandNote>
          </div>

          <aside>
            <Portrait />
            <dl className="mt-px grid gap-px bg-[var(--color-line-strong)]">
              {spec.map((s) => (
                <div
                  key={s.label}
                  className="flex items-baseline justify-between gap-4 bg-[var(--color-black)] px-4 py-3"
                >
                  <dt className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                    {s.label}
                  </dt>
                  <dd
                    className={
                      s.accent
                        ? "font-[family-name:var(--font-fraunces)] text-[1.1rem] font-normal italic text-[var(--color-red)]"
                        : "text-[0.95rem]"
                    }
                  >
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
