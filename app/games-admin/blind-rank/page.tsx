import Link from "next/link";
import { getAllBlindRankTopics, type BlindRankTopicRow } from "@/lib/games/blind-rank-data";

export const dynamic = "force-dynamic";

export default async function BlindRankAdminPage() {
  const topics = await getAllBlindRankTopics();

  const byCategory = new Map<string, BlindRankTopicRow[]>();
  for (const t of topics) {
    const cat = t.payload.category || "general";
    const list = byCategory.get(cat) ?? [];
    list.push(t);
    byCategory.set(cat, list);
  }

  const totals = topics.reduce(
    (acc, t) => {
      acc.total += 1;
      if (t.status === "live" && t.verification_status === "verified") acc.live += 1;
      else if (t.verification_status === "rejected") acc.rejected += 1;
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
            Blind Rank · Curation
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.02em] leading-tight">
            Rank <span className="italic font-normal text-[var(--color-red)]">topics.</span>
          </h1>
          <p className="text-[var(--color-warm-mute)] mt-3 max-w-[58ch] leading-relaxed">
            Each topic: 10 items, ranked 1–10 by an objective criterion. AI drafts —
            you verify the order before it goes live.
          </p>
        </div>
        <Link
          href="/games-admin/blind-rank/generate"
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors text-center whitespace-nowrap"
        >
          + Generate topic
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Topics total" value={totals.total} />
        <Stat label="Live" value={totals.live} accent="green" />
        <Stat label="Drafts" value={totals.drafts} accent="amber" />
        <Stat label="Rejected" value={totals.rejected} />
      </div>

      {topics.length === 0 ? (
        <div className="border border-dashed border-[var(--color-line)] rounded p-10 text-center">
          <div className="font-[family-name:var(--font-fraunces)] text-xl mb-2">
            No topics yet.
          </div>
          <p className="text-[var(--color-warm-mute)] text-sm mb-4">
            Run <code className="font-[family-name:var(--font-jetbrains)] text-[var(--color-red)]">
              npx tsx scripts/seed-blind-rank-launch.ts
            </code>{" "}
            to seed 20 starter drafts, or generate one above.
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
                  {list.map((t) => (
                    <TopicCard key={t.id} topic={t} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}

function TopicCard({ topic }: { topic: BlindRankTopicRow }) {
  return (
    <Link
      href={`/games-admin/blind-rank/${topic.id}/verify`}
      className="block bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 hover:border-[var(--color-line-strong)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          {topic.payload.difficulty} · {topic.payload.items.length} items
        </span>
        <StatusPill row={topic} />
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-lg tracking-tight mb-1">
        {topic.payload.title}
      </h3>
      {topic.payload.subtitle && (
        <p className="text-[var(--color-warm-mute)] text-sm leading-snug line-clamp-2">
          {topic.payload.subtitle}
        </p>
      )}
    </Link>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "green";
}) {
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

function StatusPill({
  row,
}: {
  row: { status: string; verification_status: string };
}) {
  if (row.status === "live" && row.verification_status === "verified") {
    return (
      <span className="text-[var(--color-green)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">
        live
      </span>
    );
  }
  if (row.verification_status === "rejected") {
    return (
      <span className="text-[var(--color-red-soft)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">
        rejected
      </span>
    );
  }
  return (
    <span className="text-[var(--color-amber)] font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em]">
      draft
    </span>
  );
}
