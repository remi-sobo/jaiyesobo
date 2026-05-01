import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import { getLeaderboardForCurrentSession, type Match, type HeadToHead, type PlayerRecord, type TeamCount } from "@/lib/draft-leaderboard";

export const metadata: Metadata = {
  title: "Draft Leaderboard — Jaiye's Games",
  description: "Head-to-head record book for the 2-player Draft Room.",
};

export const dynamic = "force-dynamic";

export default async function DraftLeaderboardPage() {
  const data = await getLeaderboardForCurrentSession();

  return (
    <GameShell liveLabel="Draft · leaderboard">
      <main className="max-w-[1100px] mx-auto px-6 lg:px-10 pt-16 pb-24">
        <div className="mb-6">
          <Link
            href="/games/draft?mode=friend"
            className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            ← New 2-player draft
          </Link>
        </div>

        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.25rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] mb-3">
          The <span className="italic font-normal text-[var(--color-red)]">record book.</span>
        </h1>
        <p className="text-[var(--color-mute)] mb-12 max-w-[58ch] leading-relaxed">
          Drafts played on this device. 2-player matches, plus solo runs vs. Claude
          once you&apos;ve put your name on a result. Head-to-head, all-time wins,
          most-drafted teams.
        </p>

        {data.matches.length === 0 ? (
          <EmptyState hasSession={data.has_session} />
        ) : (
          <div className="flex flex-col gap-12">
            <HeadToHeadSection rows={data.head_to_head} />
            <PlayerLeaderboardSection rows={data.player_records} />
            <TeamCountsSection rows={data.team_counts} />
            <RecentMatchesSection rows={data.matches} />
          </div>
        )}
      </main>
    </GameShell>
  );
}

function EmptyState({ hasSession }: { hasSession: boolean }) {
  return (
    <div className="px-6 py-16 border border-dashed border-[var(--color-line)] rounded text-center">
      <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
        No matches yet.
      </h2>
      <p className="text-[var(--color-mute)] mb-6 max-w-[44ch] mx-auto leading-relaxed">
        {hasSession
          ? "Play a draft and add your name afterward — your record will show up here."
          : "Once you finish your first draft and put your name on it, the leaderboard starts tracking."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/games/draft"
          className="inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Solo vs Claude →
        </Link>
        <Link
          href="/games/draft?mode=friend"
          className="inline-block bg-transparent border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors"
        >
          2-player draft →
        </Link>
      </div>
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-2">
        {subtitle}
      </div>
      <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.4rem,2.4vw,2rem)] tracking-tight mb-5">
        {children}
      </h2>
    </div>
  );
}

function HeadToHeadSection({ rows }: { rows: HeadToHead[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle subtitle="Section 01">Head-to-head</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((h) => (
          <HeadToHeadCard key={h.pair_key} row={h} />
        ))}
      </div>
    </section>
  );
}

function HeadToHeadCard({ row }: { row: HeadToHead }) {
  const aLeads = row.a_wins > row.b_wins;
  const bLeads = row.b_wins > row.a_wins;
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-2">
        {row.total} match{row.total === 1 ? "" : "es"}
      </div>
      <div className="flex items-center justify-between gap-4">
        <PlayerScore name={row.player_a} wins={row.a_wins} leads={aLeads} />
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          vs
        </span>
        <PlayerScore name={row.player_b} wins={row.b_wins} leads={bLeads} alignRight />
      </div>
      {row.ties > 0 && (
        <div className="mt-3 text-center font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-games-yellow)]">
          {row.ties} tie{row.ties === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function PlayerScore({
  name,
  wins,
  leads,
  alignRight,
}: {
  name: string;
  wins: number;
  leads: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={`flex flex-col ${alignRight ? "items-end" : "items-start"}`}>
      <span className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-tight text-[var(--color-bone)] truncate max-w-[10ch]">
        {name}
      </span>
      <span
        className="font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight"
        style={{ color: leads ? "var(--color-red)" : "var(--color-mute)" }}
      >
        {wins}
      </span>
    </div>
  );
}

function PlayerLeaderboardSection({ rows }: { rows: PlayerRecord[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle subtitle="Section 02">All-time wins</SectionTitle>
      <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded overflow-hidden">
        <ol className="divide-y divide-[var(--color-line)]">
          {rows.map((r, i) => (
            <li key={r.name + i} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)] w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-[family-name:var(--font-fraunces)] font-semibold text-base text-[var(--color-bone)] truncate">
                  {r.name}
                </span>
              </div>
              <div className="flex items-baseline gap-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em]">
                <span className="text-[var(--color-games-green)]">{r.wins}W</span>
                <span className="text-[var(--color-mute)]">{r.losses}L</span>
                {r.ties > 0 && <span className="text-[var(--color-games-yellow)]">{r.ties}T</span>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TeamCountsSection({ rows }: { rows: TeamCount[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle subtitle="Section 03">Most-drafted teams</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {rows.slice(0, 12).map((t) => (
          <div
            key={t.team_slug}
            className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-3"
            style={{ borderLeft: `3px solid ${t.primary_color}` }}
          >
            <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[0.95rem] leading-tight mb-1 text-[var(--color-bone)]">
              {t.team_label}
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
              {t.count} draft{t.count === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentMatchesSection({ rows }: { rows: Match[] }) {
  return (
    <section>
      <SectionTitle subtitle="Section 04">Recent matches</SectionTitle>
      <ol className="flex flex-col gap-2">
        {rows.slice(0, 25).map((m) => (
          <RecentMatchRow key={m.play_id} match={m} />
        ))}
      </ol>
    </section>
  );
}

function RecentMatchRow({ match }: { match: Match }) {
  const dateLabel = new Date(match.played_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(match.played_at).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
  const winnerName =
    match.winner === "p1" ? match.p1 : match.winner === "p2" ? match.p2 : null;

  const inner = (
    <div
      className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-4 hover:border-[var(--color-bone)] transition-colors"
      style={{ borderLeft: `3px solid ${match.primary_color}` }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {match.team_abbreviation} · {match.team_city} {match.team_name}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          {dateLabel}
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`font-[family-name:var(--font-fraunces)] font-semibold text-base ${
            match.winner === "p1" ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"
          }`}
        >
          {match.p1}
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          vs
        </span>
        <span
          className={`font-[family-name:var(--font-fraunces)] font-semibold text-base ${
            match.winner === "p2" ? "text-[var(--color-red)]" : "text-[var(--color-mute)]"
          }`}
        >
          {match.p2}
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-bone)] ml-auto">
          {winnerName ? `${winnerName} won` : "Tied"}
        </span>
      </div>
      {match.verdict && (
        <p className="mt-2 font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-mute)] leading-snug">
          &ldquo;{match.verdict}&rdquo;
        </p>
      )}
    </div>
  );

  return (
    <li>
      {match.share_token ? (
        <Link href={`/games/share/${match.share_token}`} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}
