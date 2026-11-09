import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SB_SEASON, parseWeekSlug } from "@/lib/sportsbook/weeks";
import { weekResultRow } from "@/lib/sportsbook/view";
import WeekPage from "@/components/sportsbook/public/week-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/runitback/[season]/[week]">): Promise<Metadata> {
  const { week } = await props.params;
  const n = parseWeekSlug(week);
  if (!n) return { title: "Run It Back Picks" };
  const row = await weekResultRow(n).catch(() => null);
  if (!row) return { title: `Week ${n} · Run It Back Picks` };
  if (row.status === "graded") return { title: `Week ${n} results · Run It Back Picks` };
  const title = `Week ${n} results: ${row.winnerName ? `${row.winnerName} won` : "a tie"} · Run It Back Picks`;
  const house = [
    { name: "Jaiye", points: row.jaiye },
    { name: "Remi", points: row.remi },
  ].filter((h) => h.name !== row.winnerName);
  const scores = row.winnerName ? [{ name: row.winnerName, points: row.winnerPoints }, ...house] : house;
  const description = `${scores.map((x) => `${x.name} ${x.points}`).join(", ")}. Every pick, every score.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function SportsbookWeekPage(props: PageProps<"/runitback/[season]/[week]">) {
  const { season, week } = await props.params;
  const n = parseWeekSlug(week);
  if (season !== SB_SEASON || !n) notFound();
  const page = await WeekPage({ n, featured: false });
  if (!page) notFound();
  return page;
}
