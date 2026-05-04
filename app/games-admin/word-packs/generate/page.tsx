import { getAllDraftTeams } from "@/lib/draft-data";
import GeneratePackForm from "@/components/games/word-search/generate-pack-form";

type Props = { searchParams: Promise<{ team_slug?: string }> };

export const dynamic = "force-dynamic";

export default async function GenerateWordPackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const teams = await getAllDraftTeams();
  const teamOptions = teams.map((t) => ({
    slug: t.draft_team_slug,
    label: `${t.payload.city} ${t.payload.name}`,
  }));

  return (
    <main className="max-w-[760px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
          Word Search · Generate
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight mb-3">
          Generate a <span className="italic font-normal text-[var(--color-red)]">word pack.</span>
        </h1>
        <p className="text-[var(--color-warm-mute)] max-w-[58ch] leading-relaxed">
          Pick a team or enter a custom theme. Claude drafts the pack — you verify and publish.
        </p>
      </div>
      <GeneratePackForm teams={teamOptions} initialTeamSlug={sp.team_slug ?? null} />
    </main>
  );
}
