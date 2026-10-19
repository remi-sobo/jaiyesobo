import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getActiveKid } from "@/lib/admin-context";
import { getPrediction } from "@/lib/nba/data";
import { CURRENT_SEASON, emptyPicks } from "@/lib/nba/logic";
import type { PredictionRow } from "@/lib/nba/types";
import PredictionBuilder from "@/components/predictions/builder/builder";
import PredictionView from "@/components/predictions/prediction-view";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  await requireAdmin("/admin/predictions");
  const kid = await getActiveKid();
  const season = CURRENT_SEASON;

  let row: PredictionRow | null = null;
  let loadError = false;
  try {
    row = await getPrediction(kid.id, season);
  } catch (e) {
    console.error(JSON.stringify({ scope: "predictions.load", err: String(e) }));
    loadError = true;
  }

  return (
    <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 lg:px-10">
      <div className="pb-5 mb-2 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Admin · Predictions · {season}
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em]">
          {kid.display_name}&apos;s NBA picks<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>
      </div>

      {loadError ? (
        <p className="mt-6 text-[var(--color-warm-mute)]">
          Couldn&apos;t load predictions. The nba_predictions table may not exist yet (migration 024).
        </p>
      ) : row?.status === "published" ? (
        <div className="mt-6">
          <div className="mb-8 flex flex-col gap-3 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--color-bone)]">Locked in. These picks can&apos;t change now.</p>
            {kid.display_name === "Jaiye" ? (
              <Link
                href={`/predictions/${season}`}
                className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
              >
                See the public page
              </Link>
            ) : null}
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-black)] px-4 py-10 md:px-8">
            <PredictionView picks={row} season={season} ownerName={kid.display_name} publishedAt={row.published_at} />
          </div>
        </div>
      ) : (
        <PredictionBuilder
          // Remount when the kid switcher changes who we're editing.
          key={kid.id}
          season={season}
          ownerName={kid.display_name}
          initialPicks={row ?? emptyPicks()}
        />
      )}
    </main>
  );
}
