import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJaiye } from "@/lib/data";
import { getPublishedPrediction } from "@/lib/nba/data";
import { CURRENT_SEASON, isSeasonSlug } from "@/lib/nba/logic";
import { PredictionsComingSoon, PublicPrediction } from "@/components/predictions/public-prediction";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/predictions/[season]">): Promise<Metadata> {
  const { season } = await props.params;
  if (!isSeasonSlug(season)) return { title: "Not found · Jaiye Sobo" };
  const title = `Jaiye's ${season} NBA Predictions`;
  const description = `Standings, playoffs, the Finals and the awards for ${season}. Locked in.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { title, description },
  };
}

export default async function SeasonPredictionPage(props: PageProps<"/predictions/[season]">) {
  const { season } = await props.params;
  if (!isSeasonSlug(season)) notFound();
  const jaiye = await getJaiye();
  const row = jaiye ? await getPublishedPrediction(jaiye.id, season) : null;
  if (!row) {
    // The current season gets a friendly placeholder. Anything else is a 404.
    if (season === CURRENT_SEASON) return <PredictionsComingSoon season={season} ownerName="Jaiye" />;
    notFound();
  }
  return <PublicPrediction row={row} ownerName="Jaiye" />;
}
