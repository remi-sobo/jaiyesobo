import Link from "next/link";
import { getAllCutSets, type CutSetRow } from "@/lib/games/the-cut-data";

export const dynamic = "force-dynamic";

export default async function CutSetsAdminPage() {
  const sets = await getAllCutSets();

  const byCategory = new Map<string, CutSetRow[]>();
  for (const s of sets) {
    const cat = s.payload.category || "general";
    const list = byCategory.get(cat) ?? [];
    list.push(s);
    byCategory.set(cat, list);
  }

  const totals = sets.reduce(
    (acc, s) => {
      acc.total += 1;
      if (s.status === "live" && s.verification_status === "verified") acc.live += 1;
      else if (s.verification_status === "rejected") acc.rejected += 1;
      else acc.drafts += 1;
      return acc;
    },
    { total: 0, live: 0, drafts: 0, rejected: 0 }
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 pb-8 border-b border-[var(--color-line)]">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-3">
            The Cut · Curation
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.02em] leading-tight">
            Cut <span className="italic font-normal text-[var(--color-red)]">sets.</span>
          </h1>
          <p className="text-[var(--color-warm-mute)] mt-3 max-w-[58ch] leading-relaxed">
            Each set: 8 players, 4 keeps + 4 cuts, hidden criterion. AI drafts —
            you verify before it goes live.
          </p>
        </div>
        <Link
          href="/games-admin/cut-sets/generate"
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors text-center whitespace-nowrap"
        >
          + Generate set
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Sets total" value={totals.total} />
        <Stat label="Live" value={totals.live} accent="green" />
        <Stat label="Drafts" value={totals.drafts} accent="amber" />
        <Stat label="Rejected" value={totals.rejected} />
      </div>

      {sets.length === 0 ? (
        <div className="border border-dashed border-[var(--color-line)] rounded p-10 text-center">
          <div className="font-[family-name:var(--font-fraunces)] text-xl mb-2">
            No cut sets yet.
          </div>
          <p className="text-[var(--color-warm-mute)] text-sm mb-4">
            Run <code className="font-[family-name:var(--font-jetbrains)] text-[var(--color-red)]">npx tsx scripts/seed-cut-launch-sets.ts</code>{" "}
            to seed 10 starter drafts, or generate one above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Array.from(byCategory.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([cat, list]) => (
              <section key={cat}>
                <h2 className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-4">
                  {cat} · {list.length}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((s) => (
                    <SetCard key={s.id} set={s} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}

function SetCard({ set }: { set: CutSetRow }) {
  const keeps = set.payload.items.filter((i) => i.is_keep).length;
  return (
    <Link
      href={`/games-admin/cut-sets/${set.id}/verify`}
      className="block bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-line-strong)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          {set.payload.difficulty} · {keeps}/4 keeps
        </span>
        <StatusPill row={set} />
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg tracking-tight mb-1">
        {set.payload.title}
      </h3>
      <p className="text-[var(--color-warm-mute)] text-sm leading-snug line-clamp-2">
        {set.payload.criterion_summary}
      </p>
    </Link>
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
      <div
        className={`font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ row }: { row: { status: string; verification_status: string } }) {
  if (row.status === "live" && row.verification_status === "verified") {
    return <span className="text-[var(--color-green)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">live</span>;
  }
  if (row.verification_status === "rejected") {
    return <span className="text-[var(--color-red-soft)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">rejected</span>;
  }
  return <span className="text-[var(--color-amber)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">draft</span>;
}
