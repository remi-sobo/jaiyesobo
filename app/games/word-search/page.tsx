import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import { getLiveWordPacks } from "@/lib/games/word-search-data";
import { getAllDraftTeams } from "@/lib/draft-data";

export const metadata: Metadata = {
  title: "Word Search · Jaiye's Games",
  description: "Themed NBA word search puzzles. Drag, find, beat the clock.",
  openGraph: {
    title: "NBA Word Search",
    description: "Themed NBA word search puzzles by Jaiye Sobo, age 8.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function WordSearchPicker() {
  const [packs, teams] = await Promise.all([getLiveWordPacks(), getAllDraftTeams()]);

  const teamsBySlug = new Map(teams.map((t) => [t.draft_team_slug, t.payload]));
  const grouped = new Map<string, typeof packs>();
  const cross: typeof packs = [];
  for (const p of packs) {
    const slug = p.payload?.team_slug ?? p.draft_team_slug;
    if (slug) {
      const list = grouped.get(slug) ?? [];
      list.push(p);
      grouped.set(slug, list);
    } else {
      cross.push(p);
    }
  }

  return (
    <GameShell liveLabel="Word Search · Beta">
      <section className="px-6 lg:px-10 pt-20 pb-10 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
          jaiyesobo.com / games / word search
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9] tracking-[-0.04em] mb-6">
          Word <span className="italic font-normal text-[var(--color-red)]">Search.</span>
        </h1>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.35rem)] text-[var(--color-bone)] max-w-[48ch] leading-snug mb-2">
          Themed NBA puzzles. Drag, find, beat the clock.
        </p>
      </section>

      {packs.length === 0 ? (
        <section className="px-6 lg:px-10 pb-24 max-w-[760px] mx-auto">
          <div className="border border-dashed border-[var(--color-line-strong)] rounded p-10 text-center">
            <div className="font-[family-name:var(--font-fraunces)] text-xl mb-2">
              No packs are live yet.
            </div>
            <p className="text-[var(--color-mute)] text-sm">
              Jaiye is verifying the first wave. Check back soon.
            </p>
          </div>
        </section>
      ) : (
        <>
          {cross.length > 0 && (
            <section className="px-6 lg:px-10 pb-12 max-w-[1100px] mx-auto">
              <h2 className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-4">
                Cross-team themes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cross.map((p) => (
                  <PackCard key={p.id} pack={p} accentColor="var(--color-games-yellow)" />
                ))}
              </div>
            </section>
          )}
          <section className="px-6 lg:px-10 pb-24 max-w-[1100px] mx-auto">
            <h2 className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
              By team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(grouped.entries()).map(([slug, list]) => {
                const team = teamsBySlug.get(slug);
                return list.map((p) => (
                  <PackCard
                    key={p.id}
                    pack={p}
                    teamLabel={team ? `${team.city} ${team.name}` : slug}
                    accentColor={team?.primary_color ?? "var(--color-red)"}
                  />
                ));
              })}
            </div>
          </section>
        </>
      )}
    </GameShell>
  );
}

function PackCard({
  pack,
  teamLabel,
  accentColor,
}: {
  pack: Awaited<ReturnType<typeof getLiveWordPacks>>[number];
  teamLabel?: string;
  accentColor: string;
}) {
  return (
    <Link
      href={`/games/word-search/${pack.payload.theme_slug}`}
      className="group bg-[var(--color-card)] border border-[var(--color-line)] rounded p-6 hover:border-[var(--color-line-strong)] hover:-translate-y-0.5 transition-all block"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em]"
          style={{ color: accentColor }}
        >
          {teamLabel ?? "Theme"}
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {pack.payload.difficulty} · {pack.payload.words.length} words
        </span>
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.4rem] leading-tight tracking-tight mb-2 group-hover:text-[var(--color-red)] transition-colors">
        {pack.payload.title}
      </h3>
      {pack.payload.subtitle && (
        <p className="text-[var(--color-mute)] text-sm leading-snug">{pack.payload.subtitle}</p>
      )}
      <div className="mt-4 inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
        Play <span className="text-base">↗</span>
      </div>
    </Link>
  );
}
