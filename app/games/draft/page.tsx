import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import { getDraftTeamSummaries } from "@/lib/draft-data";

export const metadata: Metadata = {
  title: "The Draft Room — Jaiye's Games",
  description:
    "Pick a team. Snake draft from the franchise's all-time pool. Play vs Claude or vs a friend. AI judges.",
};

export const dynamic = "force-dynamic";

type Mode = "ai" | "friend";

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function DraftLandingPage({ searchParams }: Props) {
  const params = await searchParams;
  const mode: Mode = params.mode === "friend" ? "friend" : "ai";

  const summaries = await getDraftTeamSummaries();
  const playable = summaries.filter((s) => s.verified >= 12);

  return (
    <GameShell
      liveLabel={mode === "friend" ? "Snake draft · 2 players" : "Snake draft · vs Claude"}
    >
      <section className="px-6 lg:px-10 pt-20 pb-8 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
          jaiyesobo.com / games / draft
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.03em] mb-6">
          The <span className="italic font-normal text-[var(--color-red)]">Draft Room.</span>
        </h1>
        {mode === "friend" ? (
          <>
            <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.4rem)] text-[var(--color-bone)] max-w-[52ch] leading-snug mb-3">
              Two players, one franchise. Snake draft 5 starters each from the all-time pool.
            </p>
            <p className="text-[var(--color-mute)] text-[0.95rem] max-w-[52ch] leading-relaxed mb-10">
              Pass the keyboard between turns. Five picks each, ten total. AI
              judges whose roster wins.
            </p>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.6vw,1.4rem)] text-[var(--color-bone)] max-w-[52ch] leading-snug mb-3">
              Pick a franchise. Snake draft 5 starters from their all-time pool. Beat the AI.
            </p>
            <p className="text-[var(--color-mute)] text-[0.95rem] max-w-[52ch] leading-relaxed mb-10">
              You go, the AI goes, you go again. Five picks each, ten total. AI
              judges who built the better starting 5 and tells you why.
            </p>
          </>
        )}

        {/* Mode toggle + leaderboard link */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--color-line)] bg-[var(--color-card)]">
            <ModePill href="/games/draft" label="vs Claude" active={mode === "ai"} />
            <ModePill href="/games/draft?mode=friend" label="vs a Friend" active={mode === "friend"} />
          </div>
          {mode === "friend" && (
            <Link
              href="/games/draft/leaderboard"
              className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)] hover:text-[var(--color-bone)] transition-colors"
            >
              View record book →
            </Link>
          )}
        </div>
      </section>

      <section className="px-6 lg:px-10 pt-4 pb-24 max-w-[1100px] mx-auto">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
          Pick a franchise · {playable.length} ready
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {playable.map((s) => (
            <TeamCard key={s.slug} slug={s.slug} team={s.team} verified={s.verified} mode={mode} />
          ))}
          {playable.length === 0 && (
            <div className="col-span-full p-10 border border-dashed border-[var(--color-line)] rounded text-center text-[var(--color-mute)]">
              No franchises ready yet — pools must have at least 12 verified players.
            </div>
          )}
        </div>
      </section>
    </GameShell>
  );
}

function ModePill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] transition-colors ${
        active
          ? "bg-[var(--color-bone)] text-[var(--color-black)]"
          : "text-[var(--color-mute)] hover:text-[var(--color-bone)]"
      }`}
    >
      {label}
    </Link>
  );
}

function TeamCard({
  slug,
  team,
  verified,
  mode,
}: {
  slug: string;
  team: { city: string; name: string; abbreviation: string; primary_color: string; founded: string };
  verified: number;
  mode: Mode;
}) {
  const href = mode === "friend" ? `/games/draft/${slug}/vs-friend` : `/games/draft/${slug}`;
  return (
    <Link
      href={href}
      className="group bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-bone)] transition-colors"
      style={{ borderLeft: `3px solid ${team.primary_color}` }}
    >
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)] mb-1.5">
        {team.abbreviation} · est. {team.founded}
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-xl leading-tight tracking-tight mb-3 group-hover:text-[var(--color-red)] transition-colors">
        {team.city} {team.name}
      </h3>
      <div className="flex justify-between items-baseline">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-2xl leading-none tracking-tight text-[var(--color-bone)]">
          {verified}
          <span className="font-normal text-[var(--color-mute)] text-sm ml-1">in pool</span>
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)] group-hover:text-[var(--color-red)] transition-colors">
          {mode === "friend" ? "2-player →" : "Draft →"}
        </span>
      </div>
    </Link>
  );
}
