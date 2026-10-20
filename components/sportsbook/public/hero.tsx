import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SbItem } from "@/lib/sportsbook/types";
import { ITEM_TYPE_LABEL } from "@/lib/sportsbook/types";

/** Faint half court lines behind the hero. Pure SVG, no image request. */
export function CourtLines() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 600 400" preserveAspectRatio="xMinYMid slice">
      <g fill="none" stroke="#F5F1EA" strokeWidth="2">
        <rect x="-2" y="20" width="560" height="360" />
        <rect x="-2" y="140" width="190" height="120" />
        <circle cx="188" cy="200" r="60" />
        <path d="M -2 50 L 120 50 A 190 190 0 0 1 120 350 L -2 350" />
        <circle cx="558" cy="200" r="60" />
        <line x1="558" y1="20" x2="558" y2="380" />
      </g>
    </svg>
  );
}

/** An arena style score box: label on top, big lit digits. */
export function ScoreBox({ name, points, tone }: { name: string; points: number; tone: "red" | "bone" }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center border border-[var(--color-line-strong)] bg-[#050505] px-3 py-3 shadow-[inset_0_0_24px_rgba(0,0,0,0.9)]">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)]">{name}</div>
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[clamp(2.6rem,7vw,3.6rem)] font-medium leading-none tabular-nums"
        style={{
          color: tone === "red" ? "#FF2D3D" : "#F5F1EA",
          textShadow: tone === "red" ? "0 0 18px rgba(255,45,61,0.55)" : "0 0 18px rgba(245,241,234,0.35)",
        }}
      >
        {String(points).padStart(2, "0")}
      </div>
    </div>
  );
}

export function SportsbookHero({
  jaiye,
  remi,
  weekLabel,
  cta,
}: {
  jaiye: number;
  remi: number;
  weekLabel: string;
  cta?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-off-black)]">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="relative order-2 flex flex-col justify-center gap-6 px-5 py-8 md:order-1 md:px-10 md:py-12">
          <CourtLines />
          <div className="relative flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-red)]" />
            Sobo Sportsbook · {weekLabel}
          </div>
          <h1 className="relative font-[family-name:var(--font-fraunces)] font-black uppercase leading-[0.82] tracking-[-0.045em]">
            <span className="block text-[clamp(3.4rem,10vw,6.8rem)] text-[var(--color-red)]">Jaiye</span>
            <span
              className="block font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,4vw,2.6rem)] font-normal italic lowercase text-transparent"
              style={{ WebkitTextStroke: "1px var(--color-bone)" }}
            >
              versus
            </span>
            <span className="block text-[clamp(3.4rem,10vw,6.8rem)]">Remi</span>
          </h1>
          <div className="relative flex max-w-[420px] gap-2">
            <ScoreBox name="Jaiye" points={jaiye} tone="red" />
            <ScoreBox name="Remi" points={remi} tone="bone" />
          </div>
          <p className="relative max-w-[44ch] text-[0.98rem] leading-relaxed text-[var(--color-mute)]">
            Me and my dad pick NBA games every week. Whoever gets the most right wins the week. Anyone can play!
          </p>
          {cta ? <div className="relative">{cta}</div> : null}
        </div>

        <div className="relative order-1 min-h-[300px] md:order-2 md:min-h-[520px]">
          <Image
            src="/jaiye-hero.jpg"
            alt="Jaiye in a number 23 jersey, throwing up a peace sign on the beach"
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            priority
            className="object-cover object-[center_22%] [filter:contrast(1.08)_saturate(1.1)]"
          />
          {/* Fade into the black panel and a touch of red, broadcast style. */}
          <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-off-black)_0%,transparent_45%)] md:bg-[linear-gradient(90deg,var(--color-off-black)_0%,transparent_35%)]" />
          <div className="absolute inset-0 bg-[var(--color-red)] opacity-[0.12] mix-blend-multiply" />
          <div className="absolute right-3 top-3 border border-[rgba(245,241,234,0.35)] bg-[rgba(10,10,10,0.6)] px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-bone)] backdrop-blur-sm">
            #23 · Jaiye
          </div>
        </div>
      </div>
    </section>
  );
}

/** A broadcast crawl of the week's picks. Sits still for reduced motion. */
export function Ticker({ items }: { items: SbItem[] }) {
  if (items.length === 0) return null;
  const run = items.map((i) => (
    <span key={i.id} className="flex shrink-0 items-center gap-3 pr-8">
      <span className={i.type === "upset" ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"}>{ITEM_TYPE_LABEL[i.type]}</span>
      <span className="text-[var(--color-bone)]">{i.prompt}</span>
      <span className="text-[var(--color-red)]">●</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-x border-b border-[var(--color-line-strong)] bg-[#050505] py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.12em]">
      <div className="flex w-max motion-safe:animate-[sb-ticker_60s_linear_infinite]">
        {run}
        <span aria-hidden className="flex">
          {run}
        </span>
      </div>
    </div>
  );
}

export function PlayButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center gap-3 bg-[var(--color-red)] px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.75rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors hover:bg-[var(--color-bone)]"
    >
      <span aria-hidden className="h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--color-black)]" />
      {children}
    </Link>
  );
}

/**
 * Season kickoff banner. Only renders during Week 1, then disappears on its
 * own; the caller decides with the week number, so there's nothing to remove.
 */
export function OpeningWeekBanner() {
  return (
    <div className="relative mb-3 overflow-hidden bg-[var(--color-red)] px-4 py-3 text-[var(--color-black)]">
      {/* Confetti, drawn with a few dots and dashes. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none" viewBox="0 0 400 40">
        <g fill="#0a0a0a">
          <circle cx="12" cy="8" r="2" />
          <rect x="40" y="26" width="6" height="2" transform="rotate(30 43 27)" />
          <circle cx="88" cy="30" r="1.5" />
          <rect x="130" y="6" width="6" height="2" transform="rotate(-25 133 7)" />
          <circle cx="250" cy="10" r="2" />
          <rect x="290" y="28" width="6" height="2" transform="rotate(40 293 29)" />
          <circle cx="340" cy="6" r="1.5" />
          <rect x="378" y="20" width="6" height="2" transform="rotate(-35 381 21)" />
        </g>
      </svg>
      <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <span className="font-[family-name:var(--font-fraunces)] text-[clamp(1.1rem,3vw,1.5rem)] font-black uppercase tracking-[-0.01em]">
          🎉 Opening Week
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.68rem] uppercase tracking-[0.2em]">
          The 2026-27 season tips off · Week 1 is live · Welcome to the Sobo Sportsbook
        </span>
      </div>
    </div>
  );
}
