import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SB_SEASON, parseWeekSlug } from "@/lib/sportsbook/weeks";
import WeekPage from "@/components/sportsbook/public/week-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/sportsbook/[season]/[week]">): Promise<Metadata> {
  const { week } = await props.params;
  const n = parseWeekSlug(week);
  return { title: n ? `Week ${n} · Sobo Sportsbook` : "Sobo Sportsbook" };
}

export default async function SportsbookWeekPage(props: PageProps<"/sportsbook/[season]/[week]">) {
  const { season, week } = await props.params;
  const n = parseWeekSlug(week);
  if (season !== SB_SEASON || !n) notFound();
  const page = await WeekPage({ n, featured: false });
  if (!page) notFound();
  return page;
}
