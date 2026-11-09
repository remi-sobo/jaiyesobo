import type { Metadata } from "next";
import { loadArchive } from "@/lib/sportsbook/view";
import { Standings, StandingsEmpty } from "@/components/sportsbook/public/standings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Standings · Run It Back Picks",
  description: "Jaiye vs Remi and everyone chasing them, for the whole season.",
};

export default async function StandingsPage() {
  let view = null;
  try {
    view = await loadArchive();
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.standings", err: String(e) }));
  }
  if (!view) return <StandingsEmpty />;
  return <Standings view={view} />;
}
