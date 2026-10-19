import Link from "next/link";
import type { PredictionRow } from "@/lib/nba/types";
import PredictionView from "./prediction-view";
import DownloadImageButton from "./download-image";

/** The public page body for a published prediction. */
export function PublicPrediction({ row, ownerName }: { row: PredictionRow; ownerName: string }) {
  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1400px]">
        <PredictionView
          picks={row}
          season={row.season}
          ownerName={ownerName}
          publishedAt={row.published_at}
          actions={
            <DownloadImageButton picks={row} season={row.season} ownerName={ownerName} publishedAt={row.published_at} />
          }
        />
        <div className="mt-16 border-t border-[var(--color-line)] pt-6 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          Permalink:{" "}
          <Link href={`/predictions/${row.season}`} className="text-[var(--color-bone)] hover:text-[var(--color-red)]">
            jaiyesobo.com/predictions/{row.season}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Nothing published yet. */
export function PredictionsComingSoon({ season, ownerName }: { season: string; ownerName: string }) {
  return (
    <main className="px-5 py-[clamp(64px,10vw,140px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[900px] text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
          NBA Predictions
        </div>
        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,7vw,5rem)] font-black leading-[0.9] tracking-[-0.04em]">
          {ownerName}&apos;s {season} picks are <em className="font-normal italic text-[var(--color-red)]">coming soon.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
          Standings, play-in, every playoff series, the Finals and the awards. Once they&apos;re locked in, they&apos;re
          locked forever.
        </p>
      </div>
    </main>
  );
}
