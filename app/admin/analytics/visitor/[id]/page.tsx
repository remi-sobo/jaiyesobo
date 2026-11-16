import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadVisitor } from "@/lib/analytics/data";
import { isUuid } from "@/lib/analytics/ingest";
import { clock, dayKey, describe } from "@/lib/analytics/summarize";
import { Panel } from "@/components/admin/analytics/parts";

export const dynamic = "force-dynamic";

const mono = "font-[family-name:var(--font-jetbrains)]";
const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" });

/** Everything one visitor has done, newest first. */
export default async function VisitorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireAdmin(`/admin/analytics/visitor/${id}`);
  if (!isUuid(id)) notFound();

  const data = await loadVisitor(id.toLowerCase()).catch(() => null);
  if (!data) notFound();
  const { person, name, events, summary } = data;

  // Group the timeline by Pacific day.
  const days: { key: string; label: string; events: typeof events }[] = [];
  for (const e of events) {
    const key = dayKey(e.created_at);
    let group = days[days.length - 1];
    if (!group || group.key !== key) days.push((group = { key, label: day.format(new Date(e.created_at)), events: [] }));
    group.events.push(e);
  }

  const facts = [
    ["Visits", String(person.visits)],
    ["Pages opened", String(person.pageviews)],
    ["Time on site", clock(person.seconds)],
    ["Uses a", person.device ?? "unknown"],
  ];

  return (
    <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 lg:px-10">
      <Link href="/admin/analytics" className={`${mono} text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]`}>
        ← Analytics
      </Link>
      <div className="mt-4 mb-6 border-b border-[var(--color-line)] pb-5">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-[-0.02em]">
          {name?.name}
          <span className="font-normal italic text-[var(--color-red)]">.</span>
        </h1>
        <p className="mt-2 text-[0.9rem] text-[var(--color-warm-mute)]">
          {[name?.kind, `first seen ${day.format(new Date(person.firstSeen))}`, person.private ? "asked not to be tracked, so this is one tab only" : null].filter(Boolean).join(" · ")}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className={`${mono} text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>{k}</dt>
              <dd className="mt-1 font-[family-name:var(--font-fraunces)] text-xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Timeline" note="Newest first · Pacific time">
          {days.map((d) => (
            <div key={d.key} className="mb-5 last:mb-0">
              <h3 className="mb-1 text-[0.85rem] font-semibold text-[var(--color-warm-bone)]">{d.label}</h3>
              <ol>
                {d.events.map((e) => (
                  <li key={e.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t border-[var(--color-line)] py-1.5 text-[0.88rem]">
                    <span className="tabular-nums text-[var(--color-warm-mute)]">{time.format(new Date(e.created_at))}</span>
                    <span className={`break-words ${e.type === "engage" ? "text-[var(--color-warm-mute)]" : ""}`}>{describe(e)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </Panel>

        <Panel title="Pages they like" note="By views">
          <ul>
            {summary.pages.slice(0, 12).map((p) => (
              <li key={p.path} className="flex justify-between gap-3 border-t border-[var(--color-line)] py-1.5 text-[0.88rem] first:border-t-0">
                <span className="min-w-0 break-all">{p.path}</span>
                <span className="shrink-0 tabular-nums text-[var(--color-warm-bone)]">{p.views}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
