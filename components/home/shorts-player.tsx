"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ShortWithEpisode } from "@/lib/content/shorts";

const clock = (s: number) => `0:${String(Math.round(s)).padStart(2, "0")}`;

/**
 * A rail of vertical clips. One plays at a time, with sound, right where it
 * sits. When a clip ends the next one slides in and plays. Every clip links
 * to the full episode it was cut from.
 */
export default function ShortsPlayer({ shorts }: { shorts: ShortWithEpisode[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  function center(i: number) {
    const box = rail.current;
    const card = cards.current[i];
    if (!box || !card) return;
    box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
  }

  function play(i: number) {
    videos.current.forEach((v, k) => {
      if (v && k !== i) v.pause();
    });
    const v = videos.current[i];
    if (!v) return;
    if (active !== i) v.currentTime = 0;
    setActive(i);
    setProgress(0);
    center(i);
    v.play().catch(() => setPlaying(false));
  }

  function toggle(i: number) {
    const v = videos.current[i];
    if (active === i && v && !v.paused) v.pause();
    else play(i);
  }

  function step(by: number) {
    const from = active ?? (by > 0 ? -1 : 0);
    const to = Math.min(shorts.length - 1, Math.max(0, from + by));
    if (active === null) center(to);
    else play(to);
  }

  // Stop the sound when the rail scrolls off the screen.
  useEffect(() => {
    const box = rail.current;
    if (!box) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) videos.current.forEach((v) => v?.pause());
      },
      { threshold: 0.15 },
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const arrow =
    "flex h-11 w-11 items-center justify-center border border-[var(--color-line-strong)] font-[family-name:var(--font-jetbrains)] text-[0.9rem] text-[var(--color-bone)] transition-colors hover:border-[var(--color-red)] hover:text-[var(--color-red)]";

  return (
    <div>
      <div
        ref={rail}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] min-[760px]:-mx-10 min-[760px]:gap-5 min-[760px]:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {shorts.map((s, i) => {
          const on = active === i;
          return (
            <div
              key={s.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              className="w-[min(72vw,300px)] shrink-0 snap-center"
            >
              <div
                className={`relative aspect-[9/16] w-full overflow-hidden border bg-[var(--color-black)] transition-colors duration-300 ${
                  on ? "border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
                }`}
              >
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  src={s.video}
                  poster={s.poster}
                  playsInline
                  preload="none"
                  muted={muted}
                  className="absolute inset-0 h-full w-full object-cover"
                  onPlay={() => on && setPlaying(true)}
                  onPause={() => on && setPlaying(false)}
                  onTimeUpdate={(e) => on && setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || s.seconds))}
                  onEnded={() => (i + 1 < shorts.length ? play(i + 1) : setPlaying(false))}
                >
                  Your browser does not support video.
                </video>

                {!on && (
                  <Image src={s.poster} alt="" fill sizes="300px" className="object-cover" />
                )}

                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-label={on && playing ? `Pause: ${s.title}` : `Play clip: ${s.title}`}
                  className="group absolute inset-0 flex items-center justify-center"
                >
                  {!(on && playing) && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-red)] shadow-[0_0_40px_rgba(230,57,70,0.55)] transition-transform duration-300 group-hover:scale-110">
                      <span aria-hidden className="ml-1 h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-[var(--color-black)]" />
                    </span>
                  )}
                </button>

                <span className="pointer-events-none absolute right-2 top-2 bg-[var(--color-black)]/80 px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
                  {clock(s.seconds)}
                </span>

                {on && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      className="absolute right-2 top-9 bg-[var(--color-black)]/80 px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-bone)] hover:text-[var(--color-red)]"
                    >
                      {muted ? "Sound off" : "Sound on"}
                    </button>
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[var(--color-line-strong)]">
                      <span className="block h-full bg-[var(--color-red)]" style={{ width: `${Math.min(100, progress * 100)}%` }} />
                    </span>
                  </>
                )}
              </div>

              <p className="mt-3 font-[family-name:var(--font-fraunces)] text-[1.05rem] font-black leading-[1.15] tracking-[-0.02em] text-pretty">
                {s.title}
              </p>
              <Link
                href={s.href}
                className="mt-2 inline-block font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
              >
                {s.linkLabel} ↗
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {active === null ? `${shorts.length} clips · tap one to play` : `Clip ${active + 1} of ${shorts.length}`}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous clip" className={arrow}>
            ←
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next clip" className={arrow}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}
