import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { loadDashboard, type Dashboard } from "@/lib/analytics/data";
import { RANGES, clock, describe } from "@/lib/analytics/summarize";
import TrendChart from "@/components/admin/analytics/trend-chart";
import { Empty, Panel, RankTable, Stat } from "@/components/admin/analytics/parts";

export const dynamic = "force-dynamic";

const mono = "font-[family-name:var(--font-jetbrains)]";
const when = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");
const KIND: Record<string, string> = { "short": "Short", yt: "Episode", column: "Column", pod: "Episode article" };
const kindOf = (key: string) => KIND[key.split(":")[0]] ?? "";

export default async function AdminAnalyticsPage(props: { searchParams: Promise<{ range?: string; family?: string }> }) {
  await requireAdmin("/admin/analytics");
  const sp = await props.searchParams;
  const includeFamily = sp.family === "1";

  let data: Dashboard | null = null;
  let loadError: string | null = null;
  try {
    data = await loadDashboard(sp.range, includeFamily);
  } catch (e) {
    console.error(JSON.stringify({ scope: "analytics.admin.load", err: String(e) }));
    loadError = "Couldn't load analytics. The table may not exist yet (migration 033).";
  }

  const rangeKey = data?.range.key ?? "7d";
  const href = (range: string, family: boolean) => `/admin/analytics?range=${range}${family ? "&family=1" : ""}`;

  return (
    <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 lg:px-10">
      <div className="mb-6 border-b border-[var(--color-line)] pb-5">
        <div className={`${mono} mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>Admin · Site</div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-[-0.02em]">
          Who&apos;s here<span className="font-normal italic text-[var(--color-red)]">.</span>
        </h1>
        <p className="mt-2 max-w-[60ch] text-[0.9rem] text-[var(--color-warm-mute)]">
          What people visit, click, read, watch and play on jaiyesobo.com. Your own browsing isn&apos;t counted while you&apos;re signed in here.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {RANGES.map((r) => {
            const on = r.key === rangeKey;
            return (
              <Link
                key={r.key}
                href={href(r.key, includeFamily)}
                aria-current={on ? "true" : undefined}
                className={`${mono} flex min-h-10 items-center border px-3 text-[0.62rem] uppercase tracking-[0.15em] ${
                  on ? "border-[var(--color-red)] bg-[var(--color-warm-surface-3)] text-[var(--color-bone)]" : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
          <Link
            href={href(rangeKey, !includeFamily)}
            className={`${mono} ml-auto flex min-h-10 items-center gap-2 border border-[var(--color-line-strong)] px-3 text-[0.62rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]`}
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${includeFamily ? "bg-[var(--color-green)]" : "border border-[var(--color-warm-mute)]"}`} />
            {includeFamily ? "Family included" : `Family hidden${data?.familyHidden ? ` (${data.familyHidden})` : ""}`}
          </Link>
        </div>
      </div>

      {loadError || !data ? (
        <p className="border border-[var(--color-line-strong)] p-4 text-[0.95rem] text-[var(--color-red-soft)]">{loadError}</p>
      ) : (
        <Body data={data} />
      )}
    </main>
  );
}

function Body({ data }: { data: Dashboard }) {
  const { summary: s, previous, range, games, names } = data;
  const versus = range.days === 1 ? "yesterday" : `the ${range.days} days before`;
  const visitsTotal = s.sources.reduce((n, r) => n + r.count, 0);
  const peopleTotal = s.devices.reduce((n, r) => n + r.count, 0);

  if (s.totals.pageviews === 0 && games.length === 0) {
    return (
      <div className="border border-[var(--color-line)] bg-[var(--color-warm-surface)] p-6">
        <p className="font-[family-name:var(--font-fraunces)] text-xl">Nothing recorded {range.days === 1 ? "today" : `in the last ${range.days} days`} yet.</p>
        <p className="mt-2 text-[0.9rem] text-[var(--color-warm-mute)]">
          Open the site in a browser that isn&apos;t signed in to admin, click around, then come back. Try a longer range, or turn family on.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.capped ? (
        <p className="border border-[var(--color-amber)] p-3 text-[0.85rem] text-[var(--color-amber)]">
          There are more events in this range than the page adds up at once, so these numbers run low. Pick a shorter range.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Visitors" value={s.totals.visitors.toLocaleString()} now={s.totals.visitors} before={previous.visitors} versus={versus} />
        <Stat label="Visits" value={s.totals.visits.toLocaleString()} now={s.totals.visits} before={previous.visits} versus={versus} />
        <Stat label="Page views" value={s.totals.pageviews.toLocaleString()} now={s.totals.pageviews} before={previous.pageviews} versus={versus} />
        <Stat label="Avg time on a page" value={clock(s.totals.avgSeconds)} now={s.totals.avgSeconds} before={previous.avgSeconds} versus={versus} />
      </div>

      {range.days > 1 ? (
        <Panel title="Day by day" note="Pacific time">
          <TrendChart days={s.daily} />
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Top pages" note="What people open">
          {s.pages.length ? (
            <RankTable
              head="Page"
              columns={[{ label: "Views" }, { label: "Visitors" }, { label: "Avg time" }]}
              rows={s.pages.map((p) => ({ key: p.path, name: p.path, bar: p.views, cells: [p.views.toLocaleString(), p.visitors.toLocaleString(), clock(p.avgSeconds)] }))}
            />
          ) : (
            <Empty>No page views yet.</Empty>
          )}
        </Panel>

        <Panel title="Clicks" note="Links and buttons people tap">
          {s.clicks.length ? (
            <RankTable
              head="What they clicked"
              columns={[{ label: "Clicks" }, { label: "People" }]}
              rows={s.clicks.map((c) => ({
                key: `${c.kind}|${c.target}`,
                name: c.label,
                sub: `${c.kind === "out" ? "Leaves the site → " : c.kind === "button" ? "Button · " : "→ "}${c.target}`,
                bar: c.clicks,
                cells: [c.clicks.toLocaleString(), c.visitors.toLocaleString()],
              }))}
            />
          ) : (
            <Empty>No clicks yet.</Empty>
          )}
        </Panel>

        <Panel title="Reading" note="Columns and episode articles">
          {s.reads.length ? (
            <RankTable
              head="Piece"
              columns={[{ label: "Opened" }, { label: "Halfway" }, { label: "Finished" }]}
              rows={s.reads.map((r) => ({
                key: r.key,
                name: r.label,
                sub: `${kindOf(r.key)} · ${pct(r.finished, r.opened)} of readers finish`,
                bar: r.opened,
                cells: [r.opened.toLocaleString(), r.half.toLocaleString(), r.finished.toLocaleString()],
              }))}
            />
          ) : (
            <Empty>Nobody has opened an article in this range.</Empty>
          )}
        </Panel>

        <Panel title="Watching" note="Shorts and episodes">
          {s.watches.length ? (
            <RankTable
              head="Video"
              columns={[{ label: "Plays" }, { label: "Finished" }, { label: "Watch time" }]}
              rows={s.watches.map((w) => ({
                key: w.key,
                name: w.label,
                sub: `${kindOf(w.key)} · ${w.viewers} ${w.viewers === 1 ? "viewer" : "viewers"}`,
                bar: w.plays,
                cells: [w.plays.toLocaleString(), w.finishes.toLocaleString(), clock(w.seconds)],
              }))}
            />
          ) : (
            <Empty>Nobody has pressed play in this range.</Empty>
          )}
        </Panel>

        <Panel title="Playing" note="Rounds started, from the games themselves">
          {games.length ? (
            <RankTable
              head="Game"
              columns={[{ label: "Rounds" }, { label: "Players" }]}
              rows={games.map((g) => ({ key: g.slug, name: g.title, sub: `/games/${g.slug}`, bar: g.plays, cells: [g.plays.toLocaleString(), g.players.toLocaleString()] }))}
            />
          ) : (
            <Empty>No games played in this range.</Empty>
          )}
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Panel title="Where they come from" note="By visit">
            {s.sources.length ? (
              <RankTable
                head="Source"
                columns={[{ label: "Visits" }, { label: "Share" }]}
                limit={6}
                rows={s.sources.map((r) => ({ key: r.name, name: r.name, bar: r.count, cells: [r.count.toLocaleString(), pct(r.count, visitsTotal)] }))}
              />
            ) : (
              <Empty>No visits yet.</Empty>
            )}
          </Panel>
          <Panel title="What they use" note="By visitor">
            {s.devices.length ? (
              <RankTable
                head="Device"
                columns={[{ label: "People" }, { label: "Share" }]}
                rows={s.devices.map((r) => ({ key: r.name, name: r.name[0].toUpperCase() + r.name.slice(1), bar: r.count, cells: [r.count.toLocaleString(), pct(r.count, peopleTotal)] }))}
              />
            ) : (
              <Empty>No visitors yet.</Empty>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="People" note={`${s.people.length.toLocaleString()} in this range · newest first`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[0.9rem]">
              <thead>
                <tr className={`${mono} text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-warm-mute)]`}>
                  <th className="pb-2 pr-3 text-left font-normal">Who</th>
                  <th className="pb-2 pr-3 text-left font-normal">Last seen</th>
                  <th className="pb-2 pl-3 text-right font-normal">Visits</th>
                  <th className="pb-2 pl-3 text-right font-normal">Pages</th>
                  <th className="pb-2 pl-3 text-right font-normal">Time</th>
                  <th className="pb-2 pl-3 text-left font-normal">Mostly on</th>
                </tr>
              </thead>
              <tbody>
                {s.people.slice(0, 50).map((p) => {
                  const who = names[p.visitorId];
                  const named = who && who.kind !== "No name";
                  return (
                    <tr key={p.visitorId} className="border-t border-[var(--color-line)]">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/analytics/visitor/${p.visitorId}`} className="underline decoration-[var(--color-line-hover)] underline-offset-4 hover:decoration-[var(--color-red)]">
                          <span className={named ? "font-semibold text-[var(--color-bone)]" : "text-[var(--color-warm-bone)]"}>{who?.name}</span>
                        </Link>
                        <div className="text-[0.7rem] text-[var(--color-warm-mute)]">
                          {[named ? who.kind : null, p.device, p.private ? "asked not to be tracked" : null].filter(Boolean).join(" · ") || " "}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-[var(--color-warm-bone)]">{when.format(new Date(p.lastSeen))}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">{p.visits}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">{p.pageviews}</td>
                      <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">{clock(p.seconds)}</td>
                      <td className="max-w-[180px] truncate py-2 pl-3 text-[var(--color-warm-bone)]">{p.topPath ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {s.people.length > 50 ? <p className="mt-3 text-[0.8rem] text-[var(--color-warm-mute)]">Showing the 50 most recent.</p> : null}
        </Panel>

        <Panel title="Just now" note="The last 40 things that happened">
          <ol className="flex max-h-[640px] flex-col overflow-y-auto">
            {s.recent.map((e) => (
              <li key={e.id} className="border-t border-[var(--color-line)] py-2 first:border-t-0">
                <div className="break-words text-[0.88rem] leading-snug">{describe(e)}</div>
                <div className="mt-0.5 text-[0.7rem] text-[var(--color-warm-mute)]">
                  <Link href={`/admin/analytics/visitor/${e.visitor_id}`} className="hover:text-[var(--color-bone)]">
                    {names[e.visitor_id]?.name}
                  </Link>{" "}
                  · {when.format(new Date(e.created_at))}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
