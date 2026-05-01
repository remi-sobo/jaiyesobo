import Link from "next/link";
import { getDraftTeamSummaries } from "@/lib/draft-data";

export const dynamic = "force-dynamic";

export default async function DraftTeamsPage() {
  const summaries = await getDraftTeamSummaries();

  const totals = summaries.reduce(
    (acc, s) => {
      acc.total += s.total_players;
      acc.pending += s.pending;
      acc.verified += s.verified;
      acc.rejected += s.rejected;
      return acc;
    },
    { total: 0, pending: 0, verified: 0, rejected: 0 }
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 pb-8 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-3">
            Draft Room · Curation
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.02em] leading-tight">
            All-time <span className="italic font-normal text-[var(--color-red)]">player pool.</span>
          </h1>
          <p className="text-[var(--color-warm-mute)] mt-3 max-w-[58ch] leading-relaxed">
            Each franchise needs 50–75 verified players before its draft mode can ship. Click a
            team to review, edit, and verify its pool.
          </p>
        </div>
        <Link
          href="/games-admin/draft-players/import"
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors text-center whitespace-nowrap"
        >
          + Import players
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Teams" value={summaries.length} />
        <Stat label="Players total" value={totals.total} />
        <Stat label="Pending review" value={totals.pending} accent="amber" />
        <Stat label="Verified" value={totals.verified} accent="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {summaries.map((s) => (
          <TeamCard key={s.slug} summary={s} />
        ))}
        {summaries.length === 0 && (
          <div className="col-span-full p-10 border border-dashed border-[var(--color-line-strong)] rounded text-center text-[var(--color-warm-mute)]">
            No teams seeded yet. Run <code className="font-[family-name:var(--font-jetbrains)] text-[var(--color-bone)]">npx tsx scripts/seed-draft-teams.ts</code>.
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "amber" | "green" }) {
  const color =
    accent === "amber"
      ? "text-[var(--color-amber)]"
      : accent === "green"
      ? "text-[var(--color-green)]"
      : "text-[var(--color-bone)]";
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded px-4 py-3">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
        {label}
      </div>
      <div className={`font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

function TeamCard({ summary }: { summary: ReturnType<typeof getDraftTeamSummaries> extends Promise<infer T> ? T extends Array<infer U> ? U : never : never }) {
  const ready = summary.verified >= 50;
  return (
    <Link
      href={`/games-admin/draft-players/${summary.slug}`}
      className="group bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-line-strong)] transition-colors"
      style={{ borderLeft: `3px solid ${summary.team.primary_color}` }}
    >
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1.5">
        {summary.team.abbreviation} · est. {summary.team.founded}
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-xl leading-tight tracking-tight mb-3 group-hover:text-[var(--color-red)] transition-colors">
        {summary.team.city} {summary.team.name}
      </h3>
      <div className="flex justify-between items-baseline">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight">
          {summary.total_players}
          <span className="font-normal text-[var(--color-warm-mute)] text-base ml-1">players</span>
        </div>
        {ready ? (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-green)]">
            ✓ ready
          </span>
        ) : (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            needs {Math.max(0, 50 - summary.verified)} more
          </span>
        )}
      </div>
      <div className="flex gap-3 mt-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
        <span>
          <span className="text-[var(--color-amber)]">{summary.pending}</span> pending
        </span>
        <span>
          <span className="text-[var(--color-green)]">{summary.verified}</span> verified
        </span>
        {summary.rejected > 0 && (
          <span>
            <span className="text-[var(--color-red-soft)]">{summary.rejected}</span> rejected
          </span>
        )}
      </div>
    </Link>
  );
}
