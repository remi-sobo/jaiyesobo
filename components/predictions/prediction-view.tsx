import type { ReactNode } from "react";
import { TEAMS } from "@/lib/nba/teams";
import { deriveBracket, formatLockDate, playInGames, SIDE_CONF, SIDE_LABEL } from "@/lib/nba/logic";
import { AWARDS, type PredictionPicks, type Side } from "@/lib/nba/types";
import BracketGraphic, { finalsHeadline } from "./bracket-graphic";
import { TeamChip, TeamTile } from "./team-tile";

export type PredictionViewProps = {
  picks: PredictionPicks;
  season: string;
  ownerName: string;
  /** null while it's still a draft (the Review step preview). */
  publishedAt: string | null;
};

function Label({ children, tone = "mute" }: { children: ReactNode; tone?: "mute" | "red" }) {
  const color = tone === "red" ? "var(--color-red)" : "var(--color-mute)";
  return (
    <div
      className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em]"
      style={{ color }}
    >
      <span className="h-px w-8 shrink-0" style={{ background: color }} />
      {children}
    </div>
  );
}

/* 1. Header */

export function PredictionHeader({ season, ownerName, publishedAt }: Omit<PredictionViewProps, "picks">) {
  return (
    <header className="text-center">
      <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,7cqw,5.2rem)] font-black uppercase leading-[0.9] tracking-[-0.035em]">
        {ownerName}&apos;s {season}
        <br />
        <span className="text-[var(--color-red)]">NBA Predictions</span>
      </h1>
      <div className="mt-5 inline-flex items-center gap-2 border border-[var(--color-line-strong)] px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)]">
        <span className={`h-1.5 w-1.5 rounded-full ${publishedAt ? "bg-[var(--color-red)]" : "bg-[var(--color-mute)]"}`} />
        {publishedAt ? `Locked in ${formatLockDate(publishedAt)}` : "Draft, not locked yet"}
      </div>
    </header>
  );
}

/* 2. Champion hero */

export function ChampionHero({ picks }: { picks: PredictionPicks }) {
  const b = deriveBracket(picks);
  const champ = b.FINALS.winner;
  const headline = finalsHeadline(b);
  const fmvp = picks.awards.finals_mvp;
  return (
    <section className="flex flex-col items-center text-center">
      <Label tone="red">Champion</Label>
      <div className="mt-6">
        {champ ? (
          <TeamTile code={champ} size="xl" />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[4px] border border-dashed border-[var(--color-line-strong)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Not picked yet
          </div>
        )}
      </div>
      {champ ? (
        <div className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,4cqw,2.6rem)] font-black leading-none tracking-[-0.03em]">
          {TEAMS[champ].city} {TEAMS[champ].name}
        </div>
      ) : null}
      {headline ? (
        <div className="mt-3 font-[family-name:var(--font-jetbrains)] text-[1rem] uppercase tracking-[0.15em] text-[var(--color-bone)]">
          {headline}
        </div>
      ) : null}
      {fmvp?.player ? (
        <div className="mt-2 text-[0.95rem] text-[var(--color-mute)]">
          Finals MVP: <span className="font-semibold text-[var(--color-bone)]">{fmvp.player}</span>
          {fmvp.team ? ` (${fmvp.team})` : ""}
        </div>
      ) : null}
    </section>
  );
}

/** Header, champion and bracket. This exact block is what the PNG export captures. */
export function ShareCard(props: PredictionViewProps) {
  return (
    <div className="@container flex flex-col gap-[clamp(32px,5cqw,56px)]">
      <PredictionHeader season={props.season} ownerName={props.ownerName} publishedAt={props.publishedAt} />
      <ChampionHero picks={props.picks} />
      <BracketGraphic picks={props.picks} />
    </div>
  );
}

/* 4. Play-In */

function PlayInSide({ picks, side }: { picks: PredictionPicks; side: Side }) {
  const games = playInGames(picks, side);
  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4">
      <div className="mb-3 font-[family-name:var(--font-fraunces)] text-[1.1rem] font-black">{SIDE_LABEL[side]}</div>
      <div className="flex flex-col gap-2">
        {games.map((g) => {
          const loser = g.winner ? (g.a?.code === g.winner ? g.b : g.a) : null;
          return (
            <div key={g.key} className="flex items-center gap-3 text-[0.85rem]">
              <span className="w-14 shrink-0 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
                {g.label}
              </span>
              {g.winner && loser ? (
                <span className="flex items-center gap-2">
                  <TeamChip code={g.winner} />
                  <span className="text-[var(--color-mute)]">over</span>
                  <span className="opacity-50">
                    <TeamChip code={loser.code} />
                  </span>
                </span>
              ) : (
                <span className="text-[var(--color-mute)]">TBD</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-6 border-t border-[var(--color-line)] pt-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em]">
        <span>
          <span className="text-[var(--color-mute)]">7 seed </span>
          {games[0].winner ?? "TBD"}
        </span>
        <span>
          <span className="text-[var(--color-mute)]">8 seed </span>
          {games[2].winner ?? "TBD"}
        </span>
      </div>
    </div>
  );
}

export function PlayInResults({ picks }: { picks: PredictionPicks }) {
  return (
    <section>
      <Label>Play-In</Label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PlayInSide picks={picks} side="W" />
        <PlayInSide picks={picks} side="E" />
      </div>
    </section>
  );
}

/* 5. Standings */

const ZONES = [
  { from: 1, label: "Playoffs" },
  { from: 7, label: "Play-In" },
  { from: 11, label: "Lottery" },
];

function StandingsColumn({ picks, side }: { picks: PredictionPicks; side: Side }) {
  const order = picks.standings[SIDE_CONF[side]];
  return (
    <div>
      <div className="mb-2 font-[family-name:var(--font-fraunces)] text-[1.1rem] font-black">{SIDE_LABEL[side]}</div>
      {order.map((code, i) => {
        const seed = i + 1;
        const zone = ZONES.find((z) => z.from === seed);
        return (
          <div key={code}>
            {zone ? (
              <div className="mt-3 mb-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
                {zone.label}
              </div>
            ) : null}
            <div className={`flex items-center gap-3 border-t border-[var(--color-line)] py-1.5 ${seed > 10 ? "opacity-55" : ""}`}>
              <span className="w-5 text-right font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">{seed}</span>
              <TeamChip code={code} />
              <span className="truncate text-[0.88rem]">
                {TEAMS[code].city} {TEAMS[code].name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StandingsTable({ picks }: { picks: PredictionPicks }) {
  return (
    <section>
      <Label>Final standings</Label>
      <div className="mt-5 grid gap-8 sm:grid-cols-2">
        <StandingsColumn picks={picks} side="W" />
        <StandingsColumn picks={picks} side="E" />
      </div>
    </section>
  );
}

/* 6. Awards */

export function AwardsGrid({ picks }: { picks: PredictionPicks }) {
  return (
    <section>
      <Label>Awards</Label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AWARDS.map((def) => {
          const a = picks.awards[def.key];
          const team = a?.team ? TEAMS[a.team] : null;
          const main = def.kind === "team" ? (team ? `${team.city} ${team.name}` : "") : a?.player ?? "";
          return (
            <div
              key={def.key}
              className="border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4"
              style={{ borderLeft: `4px solid ${team?.primary ?? "var(--color-line-strong)"}` }}
            >
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                {def.label}
              </div>
              <div className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.35rem] font-black leading-tight tracking-[-0.02em]">
                {main || <span className="text-[var(--color-mute)]">TBD</span>}
              </div>
              {def.kind !== "team" && team ? (
                <div className="mt-1 text-[0.8rem] text-[var(--color-mute)]">
                  {team.city} {team.name}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* 7. Hot take */

export function HotTake({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <section>
      <Label tone="red">Hot take</Label>
      <blockquote className="mt-5 border-l-4 border-[var(--color-red)] pl-5 font-[family-name:var(--font-fraunces)] text-[clamp(1.5rem,3.5vw,2.4rem)] italic leading-tight tracking-[-0.02em]">
        &ldquo;{text}&rdquo;
      </blockquote>
    </section>
  );
}

/** Everything below the share card. */
export function PredictionDetails({ picks }: { picks: PredictionPicks }) {
  return (
    <div className="flex flex-col gap-[clamp(40px,6vw,72px)]">
      <PlayInResults picks={picks} />
      <StandingsTable picks={picks} />
      <AwardsGrid picks={picks} />
      <HotTake text={picks.hot_take} />
    </div>
  );
}

export default function PredictionView(props: PredictionViewProps & { actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[clamp(40px,6vw,72px)]">
      <ShareCard {...props} />
      {props.actions}
      <PredictionDetails picks={props.picks} />
    </div>
  );
}
