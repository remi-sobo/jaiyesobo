import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · Jaiye Sobo",
  description: "Just a kid from East Palo Alto.",
};

export default function AboutPage() {
  return (
    <main className="min-h-[100vh] pt-36 pb-24 px-6 lg:px-12 bg-[var(--color-black)] relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-[60%] pointer-events-none [background:radial-gradient(circle_at_0%_40%,rgba(230,57,70,0.07),transparent_55%)]" />

      <div className="relative max-w-[820px] mx-auto">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />
          — About —
        </div>

        <h1 className="font-[family-name:var(--font-fraunces)] font-black leading-[0.85] tracking-[-0.045em] text-[clamp(4.5rem,12vw,11rem)] mb-10">
          Abou<span className="italic font-normal text-[var(--color-red)]">t</span>.
        </h1>

        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.2rem,1.8vw,1.6rem)] text-[var(--color-bone)] leading-snug mb-10 max-w-[38ch]">
          Just a kid from East Palo Alto.
        </p>

        <div className="flex flex-col gap-5 text-[1.05rem] leading-relaxed text-[var(--color-bone)] max-w-[62ch]">
          <p>
            I&apos;m <em className="italic text-[var(--color-red)] not-italic font-semibold">Jaiye</em>. I&apos;m 8.
            I live in East Palo Alto, California.
          </p>
          <p>
            I love <em className="italic text-[var(--color-red)] not-italic font-semibold">basketball</em>, building
            things, my family, and Jesus.
          </p>
          <p>
            This site is where I share what I&apos;m into and what I&apos;m working on. My dad helps me build it.
          </p>
        </div>

        <div className="mt-16 pt-10 border-t border-[var(--color-line)] max-w-[680px]">
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-5">
            <span className="w-8 h-px bg-[var(--color-red)]" />
            Soon I&apos;ll add
          </div>
          <ul className="flex flex-col gap-2.5 list-none text-[var(--color-mute)]">
            <li className="font-[family-name:var(--font-fraunces)] text-[1rem] leading-snug pl-6 relative before:content-['—'] before:absolute before:left-0">
              More about my family
            </li>
            <li className="font-[family-name:var(--font-fraunces)] text-[1rem] leading-snug pl-6 relative before:content-['—'] before:absolute before:left-0">
              Where I&apos;m from
            </li>
            <li className="font-[family-name:var(--font-fraunces)] text-[1rem] leading-snug pl-6 relative before:content-['—'] before:absolute before:left-0">
              What I want to be when I&apos;m older
            </li>
            <li className="font-[family-name:var(--font-fraunces)] text-[1rem] leading-snug pl-6 relative before:content-['—'] before:absolute before:left-0">
              How this site got built
            </li>
          </ul>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-16 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
