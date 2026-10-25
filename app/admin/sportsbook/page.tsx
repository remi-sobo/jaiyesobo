import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/sportsbook/draft";
import { getHousePlayers } from "@/lib/sportsbook/players";
import { loadWeekView } from "@/lib/sportsbook/view";
import { currentWeekNumber, requestNow, weekRangeLabel, weekWindow } from "@/lib/sportsbook/weeks";
import SharedPicks from "@/components/sportsbook/admin/shared-picks";
import SlateEditor, { AddPropInline } from "@/components/sportsbook/admin/slate-editor-entry";
import ResultsPanel, { BoardTable, ChallengersPanel, SettingsPanel } from "@/components/sportsbook/admin/results-panel";
import RefreshButton from "@/components/sportsbook/admin/refresh-button";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminSportsbookPage(props: { searchParams: Promise<{ week?: string }> }) {
  await requireAdmin("/admin/sportsbook");
  const sp = await props.searchParams;
  const current = currentWeekNumber();
  const n = Math.min(40, Math.max(1, Number(sp.week) || current));

  let loadError: string | null = null;
  let view: Awaited<ReturnType<typeof loadWeekView>> = null;
  let house: Awaited<ReturnType<typeof getHousePlayers>> | null = null;
  let settings: Awaited<ReturnType<typeof getSettings>> = { fav_teams: [], fav_players: [] };
  try {
    [view, house, settings] = await Promise.all([loadWeekView(n, { admin: true }), getHousePlayers(), getSettings()]);
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.admin.load", err: String(e) }));
    loadError = "Couldn't load the Sportsbook. The tables may not exist yet (migration 025).";
  }
  const w = weekWindow(n);
  const status = view?.week.status ?? "none";

  return (
    <main className="@container px-4 pt-6 pb-24 md:px-8 md:pt-8 lg:px-10">
      <div className="mb-6 border-b border-[var(--color-line)] pb-5">
        <div className="mb-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          Admin · Run It Back Picks
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-[-0.02em]">
          Jaiye vs Remi<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/sportsbook?week=${Math.max(1, n - 1)}`}
            aria-label="Previous week"
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-line-strong)]"
          >
            ‹
          </Link>
          <div className="min-w-[150px]">
            <div className="font-[family-name:var(--font-fraunces)] text-xl font-black">Week {n}</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
              {weekRangeLabel(w)} · {status === "none" ? "not started" : status}
              {n === current ? " · this week" : ""}
            </div>
          </div>
          <Link
            href={`/admin/sportsbook?week=${n + 1}`}
            aria-label="Next week"
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-line-strong)]"
          >
            ›
          </Link>
          <RefreshButton />
          <Link
            href="/runitback"
            className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] text-[var(--color-red)]"
          >
            Public page
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="text-[var(--color-warm-mute)]">{loadError}</p>
      ) : (
        <>
          {status === "none" || status === "draft" ? (
            <SlateEditor week={n} items={view?.items ?? []} status={status === "none" ? "none" : "draft"} now={view?.now ?? requestNow()} />
          ) : null}

          {status === "open" && view && house ? (
            <>
              <p className="mb-5 max-w-[60ch] text-[0.9rem] text-[var(--color-warm-mute)]">
                Pass the phone. A pick stays covered until you&apos;ve both picked that card. When you&apos;re done, tap Submit: your picks lock for the week and show on the public page. Anything not submitted locks at tip-off.
              </p>
              <SharedPicks items={view.items} picks={view.picks} ids={{ jaiye: house.jaiye.id, remi: house.remi.id }} now={view.now} week={n} submitted={view.submitted} />
              <AddPropInline week={n} />
              <Section title="Live board">
                <BoardTable board={view.board} />
              </Section>
            </>
          ) : null}

          {(status === "graded" || status === "final") && view ? (
            <ResultsPanel week={n} status={view.week.status} items={view.items} board={view.board} recap={view.week.recap} />
          ) : null}

          <Section title="Challengers">
            <ChallengersPanel players={view?.players ?? []} />
          </Section>
          <Section title="Settings">
            <SettingsPanel favTeams={settings.fav_teams} favPlayers={settings.fav_players} />
          </Section>
        </>
      )}
    </main>
  );
}
