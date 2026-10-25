import type { Metadata } from "next";
import { loadArchive } from "@/lib/sportsbook/view";
import { Archive, ArchiveEmpty } from "@/components/sportsbook/public/archive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Season archive · Run It Back Picks",
  description: "Every past week of Jaiye vs Remi — every pick, every score, every challenger.",
  openGraph: {
    title: "Season archive · Run It Back Picks",
    description: "Every past week of Jaiye vs Remi — every pick, every score, every challenger.",
    type: "website",
  },
};

export default async function SportsbookArchivePage() {
  let view = null;
  try {
    view = await loadArchive();
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.archive", err: String(e) }));
  }
  if (!view) return <ArchiveEmpty />;
  return <Archive view={view} />;
}
