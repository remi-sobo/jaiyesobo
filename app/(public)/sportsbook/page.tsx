import type { Metadata } from "next";
import { featuredWeekNumber } from "@/lib/sportsbook/view";
import WeekPage, { SportsbookEmpty } from "@/components/sportsbook/public/week-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sobo Sportsbook · Jaiye vs Remi",
  description: "A weekly NBA pick'em, all season long. No money, just bragging rights. Think you can beat us?",
  openGraph: {
    title: "Sobo Sportsbook · Jaiye vs Remi",
    description: "A weekly NBA pick'em. Think you can beat us?",
    type: "website",
  },
};

export default async function SportsbookPage() {
  let n: number | null = null;
  try {
    n = await featuredWeekNumber();
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.public", err: String(e) }));
  }
  if (!n) return <SportsbookEmpty />;
  return (await WeekPage({ n, featured: true })) ?? <SportsbookEmpty />;
}
