"use client";

import { useRef } from "react";
import { track } from "@/lib/analytics/client";
import { PlayButton } from "./hero";

const TITLE = "Can you beat a 9-year-old at NBA picks?";

/** Jaiye's 48 second explainer for the game. The words are burned into the video, so it needs no caption track. */
export default function PromoVideo({ cta = true, className = "" }: { cta?: boolean; className?: string }) {
  const started = useRef(false);
  const mark = useRef(0);

  return (
    <section aria-label="How Run It Back Picks works" className={`grid grid-cols-1 items-center gap-[clamp(20px,4vw,48px)] border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-[clamp(16px,3vw,32px)] sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] ${className}`}>
      <video
        controls
        playsInline
        preload="none"
        poster="/runitback/promo.jpg"
        width={720}
        height={1280}
        className="mx-auto aspect-[9/16] w-full max-w-[260px] bg-[var(--color-black)]"
        onPlay={(e) => {
          mark.current = e.currentTarget.currentTime;
          if (started.current) return;
          started.current = true;
          track({ t: "watch", k: "promo:runitback", l: TITLE, d: "start" });
        }}
        onPause={(e) => {
          // Fires on pause and right before "ended". Report the seconds watched since the last play.
          const secs = Math.round(e.currentTarget.currentTime - mark.current);
          mark.current = e.currentTarget.currentTime;
          if (secs >= 1) track({ t: "watch", k: "promo:runitback", l: TITLE, d: "time", n: secs });
        }}
        onEnded={() => track({ t: "watch", k: "promo:runitback", l: TITLE, d: "complete" })}
      >
        <source src="/runitback/promo.mp4" type="video/mp4" />
        Your browser can&apos;t play this video.
      </video>
      <div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">How it works · 48 seconds</div>
        <h2 className="!mt-3 font-[family-name:var(--font-fraunces)] !text-[clamp(1.6rem,3.6vw,2.4rem)] font-black leading-[1.02] tracking-[-0.02em] text-balance">{TITLE}</h2>
        <ol className="mt-5 flex flex-col gap-2 text-[1rem] leading-[1.5] text-[var(--color-bone)]">
          <li className="!ml-0 !list-none"><span className="mr-2 font-[family-name:var(--font-jetbrains)] text-[var(--color-red)]">1</span>New NBA picks every Monday.</li>
          <li className="!ml-0 !list-none"><span className="mr-2 font-[family-name:var(--font-jetbrains)] text-[var(--color-red)]">2</span>You pick. Jaiye picks. His dad picks.</li>
          <li className="!ml-0 !list-none"><span className="mr-2 font-[family-name:var(--font-jetbrains)] text-[var(--color-red)]">3</span>Check the leaderboard to see who&apos;s on top.</li>
        </ol>
        {cta ? (
          <div className="mt-6 flex flex-col items-start gap-2">
            <PlayButton href="/runitback/play">Play free</PlayButton>
            <span className="text-[0.8rem] text-[var(--color-mute)]">Just type your name. No sign up.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
