import Link from "next/link";
import { SB_SEASON, weekRangeLabel, weekSlug } from "@/lib/sportsbook/weeks";
import type { ArchiveView } from "@/lib/sportsbook/view";
import { SeasonStandings } from "./public-week";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
      <span className="h-px w-8 bg-[var(--color-red)]" />
      {children}
    </div>
  );
}

const STATUS_LABEL = {
  open: "In play",
  graded: "Grading",
  final: "Final",
} as const;

function Chip({ children, tone = "line" }: { children: React.ReactNode; tone?: "line" | "red" | "yellow" | "green" }) {
  const tones = {
    line: "border-[var(--color-line-strong)] text-[var(--color-mute)]",
    red: "border-[var(--color-red)] text-[var(--color-red)]",
    yellow: "border-[var(--color-games-yellow)] text-[var(--color-games-yellow)]",
    green: "border-[var(--color-green)] text-[var(--color-green)]",
  };
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.18em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function h2hLine(h2h: ArchiveView["weeks"][number]["headToHead"], j: number, r: number, jaiyeName: string, remiName: string): string {
  if (h2h === "jaiye") return `${jaiyeName} ${j} · ${remiName} ${r}`;
  if (h2h === "remi") return `${remiName} ${r} · ${jaiyeName} ${j}`;
  return `${jaiyeName} ${j} · ${remiName} ${r}`;
}

export function Archive({ view }: { view: ArchiveView }) {
  const { weeks, summary, jaiyeName, remiName } = view;
  const totals = {
    finals: weeks.filter((w) => w.week.status === "final").length,
    inPlay: weeks.filter((w) => w.week.status !== "final").length,
    challengers: summary.rows.filter((r) => r.player.kind === "challenger").length,
    beatBoth: summary.rows.filter((r) => r.player.kind === "challenger" && r.beatJaiye > 0 && r.beatRemi > 0).length,
  };

  return (
    <main className="px-4 py-[clamp(40px,6vw,80px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1240px]">
        <header className="flex flex-col gap-6 border-b border-[var(--color-line-strong)] pb-10">
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-red)]" />
            Run It Back Picks · Season {SB_SEASON} archive
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,8vw,5.4rem)] font-black uppercase leading-[0.88] tracking-[-0.04em]">
            Every week. <span className="text-[var(--color-red)]">Every pick.</span>
          </h1>
          <p className="max-w-[60ch] text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
            Me vs my dad, from Week 1 on. Tap any week to see every pick, every point, and every person who tried to beat us.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Weeks played" value={weeks.length} />
            <StatTile label="Weeks final" value={totals.finals} />
            <StatTile label="Challengers all season" value={totals.challengers} />
            <StatTile label="Beat Jaiye &amp; Remi" value={totals.beatBoth} />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em]">
            <Link
              href="/runitback"
              className="inline-flex min-h-10 items-center border border-[var(--color-line-strong)] px-3 text-[var(--color-bone)] hover:border-[var(--color-red)]"
            >
              ← Back to this week
            </Link>
            <Link
              href="/runitback/play"
              className="inline-flex min-h-10 items-center bg-[var(--color-red)] px-3 text-[var(--color-black)] hover:bg-[var(--color-bone)]"
            >
              Join this week
            </Link>
          </div>
        </header>

        <section className="mt-[clamp(40px,6vw,72px)]">
          <Label>Season standings</Label>
          <div className="mt-5">
            <SeasonStandings summary={summary} />
          </div>
        </section>

        <section className="mt-[clamp(48px,7vw,88px)]">
          <Label>Week by week</Label>
          <ol className="mt-5 flex flex-col gap-4">
            {weeks.map((w) => {
              const status = w.week.status === "open" || w.week.status === "graded" || w.week.status === "final" ? STATUS_LABEL[w.week.status] : "";
              const h2h = w.headToHead;
              const tie = h2h === "tie";
              const sobosLead = h2h === "jaiye" ? jaiyeName : h2h === "remi" ? remiName : null;
              return (
                <li key={w.week.id}>
                  <Link
                    href={`/runitback/${w.week.season}/${weekSlug(w.week.week_number)}`}
                    className="group grid grid-cols-1 gap-5 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-5 transition-colors hover:border-[var(--color-red)] md:grid-cols-[220px_minmax(0,1fr)_200px] md:items-center md:gap-6"
                  >
                    <div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
                        Week {w.week.week_number}
                      </div>
                      <div className="mt-1 font-[family-name:var(--font-fraunces)] text-[1.6rem] font-black leading-tight tracking-[-0.02em]">
                        {weekRangeLabel(w.week)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {status ? (
                          <Chip tone={w.week.status === "final" ? "green" : w.week.status === "open" ? "red" : "yellow"}>{status}</Chip>
                        ) : null}
                        {w.week.recap ? <Chip tone="line">Recap</Chip> : null}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                        Head to head
                      </div>
                      <div
                        className={`mt-1 font-[family-name:var(--font-fraunces)] text-[1.4rem] font-black leading-tight tracking-[-0.02em] ${
                          w.gradedCount === 0 ? "text-[var(--color-mute)]" : tie ? "text-[var(--color-bone)]" : sobosLead ? "" : "text-[var(--color-mute)]"
                        }`}
                      >
                        {w.gradedCount === 0 ? "Picks in · nothing graded yet" : h2h ? h2hLine(h2h, w.jaiyePoints, w.remiPoints, jaiyeName, remiName) : "Still tied"}
                      </div>
                      {w.topChallenger ? (
                        <div className="mt-3 text-[0.9rem] text-[var(--color-bone)]">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                            Top challenger ·{" "}
                          </span>
                          <span className="font-medium">{w.topChallenger.name}</span>
                          <span className="ml-2 text-[var(--color-mute)]">{w.topChallenger.points} pts</span>
                          {w.topChallenger.beatJaiye && w.topChallenger.beatRemi ? (
                            <span className="ml-2 text-[var(--color-games-yellow)]">beat Jaiye &amp; Remi</span>
                          ) : w.topChallenger.beatJaiye ? (
                            <span className="ml-2 text-[var(--color-games-yellow)]">beat Jaiye</span>
                          ) : w.topChallenger.beatRemi ? (
                            <span className="ml-2 text-[var(--color-games-yellow)]">beat Remi</span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3 text-[0.85rem] text-[var(--color-mute)]">No challengers yet</div>
                      )}
                      {w.week.recap ? (
                        <p className="mt-3 line-clamp-2 max-w-[60ch] text-[0.92rem] italic text-[var(--color-mute)]">&ldquo;{w.week.recap}&rdquo;</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                        {w.challengerCount} {w.challengerCount === 1 ? "challenger" : "challengers"}
                      </div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                        {w.gradedCount} of {w.itemCount} graded
                      </div>
                      <span className="mt-1 inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-bone)] group-hover:text-[var(--color-red)]">
                        See all picks →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-fraunces)] text-[2rem] font-black leading-none tracking-[-0.02em]">{value}</div>
    </div>
  );
}

export function ArchiveEmpty() {
  return (
    <main className="px-5 py-[clamp(64px,10vw,140px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[900px] text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">Run It Back Picks · Archive</div>
        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.4rem,7vw,5rem)] font-black leading-[0.9] tracking-[-0.04em]">
          Nothing to look back on <em className="font-normal italic text-[var(--color-red)]">yet.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-[var(--color-mute)]">
          Once Week 1 is in the books, every pick and every score will live here.
        </p>
        <div className="mt-8">
          <Link
            href="/runitback"
            className="inline-flex min-h-11 items-center border border-[var(--color-line-strong)] px-4 font-[family-name:var(--font-jetbrains)] text-[0.72rem] uppercase tracking-[0.2em] hover:border-[var(--color-red)]"
          >
            Back to this week
          </Link>
        </div>
      </div>
    </main>
  );
}
