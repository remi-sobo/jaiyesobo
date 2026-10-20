import type { Metadata } from "next";
import { getJaiye } from "@/lib/data";
import { getLatestPublishedPrediction } from "@/lib/nba/data";
import { CURRENT_SEASON } from "@/lib/nba/logic";
import { PredictionsComingSoon, PublicPrediction } from "@/components/predictions/public-prediction";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NBA Predictions · Jaiye Sobo",
  description: "My picks for the whole NBA season. Who makes the playoffs, who wins it all, and who wins MVP. No take backs.",
};

export default async function PredictionsPage() {
  const jaiye = await getJaiye();
  const row = jaiye ? await getLatestPublishedPrediction(jaiye.id) : null;
  if (!row) return <PredictionsComingSoon season={CURRENT_SEASON} ownerName="Jaiye" />;
  return <PublicPrediction row={row} ownerName="Jaiye" />;
}
