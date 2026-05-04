import Link from "next/link";
import { getAllDraftTeams } from "@/lib/draft-data";
import { getAllWordPacks } from "@/lib/games/word-search-data";

export const dynamic = "force-dynamic";

export default async function WordPacksAdminPage() {
  const [packs, teams] = await Promise.all([getAllWordPacks(), getAllDraftTeams()]);

  const byTeam = new Map<string, typeof packs>();
  const customPacks: typeof packs = [];
  for (const p of packs) {
    const slug = p.payload?.team_slug ?? p.draft_team_slug;
    if (slug) {
      const list = byTeam.get(slug) ?? [];
      list.push(p);
      byTeam.set(slug, list);
    } else {
      customPacks.push(p);
    }
  }

  const totals = packs.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.status === "live" && p.verification_status === "verified") acc.live += 1;
      else if (p.status === "draft") acc.drafts += 1;
      return acc;
    },
    { total: 0, live: 0, drafts: 0 }
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 pb-8 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-3">
            Word Search · Curation
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.02em] leading-tight">
            Word <span className="italic font-normal text-[var(--color-red)]">packs.</span>
          </h1>
          <p className="text-[var(--color-warm-mute)] mt-3 max-w-[58ch] leading-relaxed">
            Each pack is a themed word search puzzle. AI drafts a starter list — you verify before
            it goes live.
          </p>
        </div>
        <Link
          href="/games-admin/word-packs/generate"
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors text-center whitespace-nowrap"
        >
          + Generate pack
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Packs total" value={totals.total} />
        <Stat label="Live" value={totals.live} accent="green" />
        <Stat label="Drafts" value={totals.drafts} accent="amber" />
        <Stat label="Teams w/ packs" value={byTeam.size} />
      </div>

      {customPacks.length > 0 && (
        <section className="mb-10">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-4">
            Cross-team themes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customPacks.map((p) => (
              <PackCard key={p.id} pack={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-4">By team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((t) => {
            const list = byTeam.get(t.draft_team_slug) ?? [];
            return (
              <div
                key={t.draft_team_slug}
                className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5"
                style={{ borderLeft: `3px solid ${t.payload.primary_color}` }}
              >
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1.5">
                  {t.payload.abbreviation}
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg leading-tight tracking-tight mb-3">
                  {t.payload.city} {t.payload.name}
                </h3>
                {list.length === 0 ? (
                  <Link
                    href={`/games-admin/word-packs/generate?team_slug=${encodeURIComponent(
                      t.draft_team_slug
                    )}`}
                    className="inline-block font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)] transition-colors"
                  >
                    + Generate pack →
                  </Link>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {list.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/games-admin/word-packs/${p.id}/verify`}
                          className="block group"
                        >
                          <span className="font-[family-name:var(--font-fraunces)] text-base text-[var(--color-bone)] group-hover:text-[var(--color-red)] transition-colors">
                            {p.payload.title}
                          </span>
                          <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">
                            <StatusPill row={p} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
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

function StatusPill({
  row,
}: {
  row: {
    status: string;
    verification_status: string;
  };
}) {
  if (row.status === "live" && row.verification_status === "verified") {
    return <span className="text-[var(--color-green)]">live</span>;
  }
  if (row.verification_status === "rejected") {
    return <span className="text-[var(--color-red-soft)]">rejected</span>;
  }
  return <span className="text-[var(--color-amber)]">draft</span>;
}

function PackCard({ pack }: { pack: Awaited<ReturnType<typeof getAllWordPacks>>[number] }) {
  return (
    <Link
      href={`/games-admin/word-packs/${pack.id}/verify`}
      className="block bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-line-strong)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          {pack.payload.difficulty} · {pack.payload.words.length} words
        </span>
        <StatusPill row={pack} />
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg tracking-tight mb-1">
        {pack.payload.title}
      </h3>
      {pack.payload.subtitle && (
        <p className="text-[var(--color-warm-mute)] text-sm leading-snug">{pack.payload.subtitle}</p>
      )}
    </Link>
  );
}
