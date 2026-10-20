import type { SeasonSummary } from "@/lib/sportsbook/data";
import type { ReactionMap } from "@/lib/sportsbook/fans";
import type { SbItem, SbPick, SbPlayer } from "@/lib/sportsbook/types";
import { CardHead, CardPrompt, ResultLine, TeamDot, Who, isLocked, isWinningOption } from "../card-parts";
import { ReactionBar } from "./fan-bits";

type House = { jaiye: SbPlayer | undefined; remi: SbPlayer | undefined };

function HousePick({
  item,
  player,
  pick,
  tone,
  reactions,
  allPicks,
  locked,
}: {
  locked: boolean;
  item: SbItem;
  player: SbPlayer | undefined;
  pick: SbPick | undefined;
  tone: "jaiye" | "remi";
  reactions: ReactionMap;
  allPicks: SbPick[];
}) {
  if (!player) return null;
  if (!pick && !locked) {
    return (
      <div className="flex items-center gap-2 border-t border-[var(--color-line)] pt-2 text-[0.9rem]">
        <Who label={tone === "jaiye" ? "J" : "R"} tone={tone} />
        <span className="font-medium">{player.display_name}</span>
        <span className="text-[var(--color-mute)]">Not submitted yet</span>
      </div>
    );
  }
  const label =
    item.type === "closest"
      ? pick?.guess !== null && pick?.guess !== undefined
        ? String(pick.guess)
        : "No pick"
      : item.options.find((o) => o.key === pick?.choice)?.label ?? "No pick";
  let right: boolean | null = null;
  if (pick && item.status === "graded" && item.result) {
    if (item.type === "closest") {
      const actual = item.result.actual ?? 0;
      const best = Math.min(...allPicks.filter((p) => p.item_id === item.id && p.guess !== null).map((p) => Math.abs((p.guess ?? 0) - actual)));
      right = pick.guess !== null && Math.abs(pick.guess - actual) === best;
    } else right = !!pick.choice && item.result.winners.includes(pick.choice);
  }
  const r = reactions[`${item.id}:${player.id}`];
  return (
    <div className="min-w-0 border-t border-[var(--color-line)] pt-2">
      <div className="flex items-center gap-2 text-[0.9rem]">
        <Who label={tone === "jaiye" ? "J" : "R"} tone={tone} />
        <span className="font-medium">{player.display_name}</span>
        <span className="min-w-0 flex-1 truncate text-[var(--color-mute)]">{label}</span>
        {pick?.is_lock ? <span className="text-[var(--color-games-yellow)]" title="Lock of the Week">★</span> : null}
        {right === true ? <span className="text-[var(--color-green)]">✓</span> : right === false ? <span className="text-[var(--color-red)]">✗</span> : null}
      </div>
      {pick?.talk ? <p className="mt-1 pl-7 text-[0.82rem] italic text-[var(--color-mute)]">&ldquo;{pick.talk}&rdquo;</p> : null}
      {pick ? (
        <div className="pl-7">
          <ReactionBar itemId={item.id} playerId={player.id} counts={r?.counts ?? {}} mine={r?.mine ?? []} />
        </div>
      ) : null}
    </div>
  );
}

export function PublicCard({
  item,
  picks,
  players,
  house,
  reactions,
  now,
}: {
  item: SbItem;
  picks: SbPick[];
  players: SbPlayer[];
  house: House;
  reactions: ReactionMap;
  now: number;
}) {
  const locked = isLocked(item, now) || item.status !== "open";
  const mine = picks.filter((p) => p.item_id === item.id);
  // House picks only reach the page once submitted (or at tip-off).
  const houseIn = mine.some((p) => p.player_id === house.jaiye?.id || p.player_id === house.remi?.id);
  const revealed = locked || houseIn;
  const challengerIds = new Set(players.filter((p) => p.kind === "challenger").map((p) => p.id));
  const crowd = mine.filter((p) => challengerIds.has(p.player_id) && p.choice !== null);
  return (
    <div className="relative flex flex-col border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4 pt-5">
      {/* Slip stripe: red for the Upset Special, yellow for Jaiye's Prop. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: item.type === "upset" ? "var(--color-red)" : item.type === "custom" ? "var(--color-games-yellow)" : "var(--color-line-strong)" }}
      />
      <CardHead item={item} now={now} />
      <CardPrompt item={item} />
      {item.type !== "closest" ? (
        <ul className="mt-3 flex flex-col gap-1">
          {item.options.map((o) => {
            const won = isWinningOption(item, o.key);
            const share = crowd.length ? Math.round((crowd.filter((p) => p.choice === o.key).length / crowd.length) * 100) : null;
            return (
              <li key={o.key} className={`flex items-center gap-2 text-[0.88rem] ${item.status === "graded" && !won ? "text-[var(--color-mute)]" : ""}`}>
                <TeamDot option={o} />
                <span className="min-w-0 flex-1">{o.label}</span>
                {share !== null ? (
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-mute)]">{share}%</span>
                ) : null}
                {won ? <span className="text-[var(--color-green)]">✓</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {/* Perforated tear line, like a betting slip. */}
      <div aria-hidden className="relative -mx-4 mt-4 border-t border-dashed border-[var(--color-line-strong)]">
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-black)]" />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-black)]" />
      </div>
      <div className="mt-1 flex flex-1 flex-col justify-end gap-2">
        {revealed ? (
          <>
            <HousePick item={item} player={house.jaiye} pick={mine.find((p) => p.player_id === house.jaiye?.id)} tone="jaiye" reactions={reactions} allPicks={picks} locked={locked} />
            <HousePick item={item} player={house.remi} pick={mine.find((p) => p.player_id === house.remi?.id)} tone="remi" reactions={reactions} allPicks={picks} locked={locked} />
            {crowd.length ? (
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
                % = what {crowd.length} {crowd.length === 1 ? "challenger" : "challengers"} picked
              </div>
            ) : null}
          </>
        ) : (
          <div className="border-t border-[var(--color-line)] pt-2 text-[0.82rem] text-[var(--color-mute)]">
            Jaiye and Remi haven&apos;t submitted their picks yet.
          </div>
        )}
      </div>
      <ResultLine item={item} />
    </div>
  );
}

export function SeasonStandings({ summary }: { summary: SeasonSummary }) {
  const { jaiyeVsRemi: h, rows, weekly } = summary;
  const leader = h.jaiye > h.remi ? `Jaiye leads ${h.jaiye}-${h.remi}` : h.remi > h.jaiye ? `Remi leads ${h.remi}-${h.jaiye}` : h.jaiye ? `Tied ${h.jaiye}-${h.remi}` : "No weeks final yet";
  const max = Math.max(1, ...weekly.flatMap((w) => [w.jaiye, w.remi]));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-[family-name:var(--font-fraunces)] text-[clamp(1.8rem,5vw,2.8rem)] font-black leading-none tracking-[-0.03em]">{leader}</div>
        <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          Jaiye vs Remi, weeks won{h.ties ? ` · ${h.ties} tied` : ""}
        </div>
      </div>

      {weekly.length ? (
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1" aria-label="Points by week">
          {weekly.map((w) => (
            <div key={w.week} className="flex shrink-0 flex-col items-center gap-1">
              <div className="flex h-20 items-end gap-0.5">
                <div className="w-2.5 bg-[var(--color-red)]" style={{ height: `${Math.max(2, (w.jaiye / max) * 80)}px` }} title={`Jaiye ${w.jaiye}`} />
                <div className="w-2.5 bg-[var(--color-bone)]" style={{ height: `${Math.max(2, (w.remi / max) * 80)}px` }} title={`Remi ${w.remi}`} />
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-[var(--color-mute)]">W{w.week}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[0.9rem]">
          <thead>
            <tr className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
              <th className="py-2 pr-2 font-normal">#</th>
              <th className="py-2 pr-2 font-normal">Player</th>
              <th className="py-2 pr-2 text-right font-normal">Points</th>
              <th className="py-2 pr-2 text-right font-normal">Weeks won</th>
              <th className="py-2 pr-2 text-right font-normal">Beat Jaiye</th>
              <th className="py-2 pr-2 text-right font-normal">Beat Remi</th>
              <th className="py-2 text-right font-normal">Best week</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const house = r.player.kind !== "challenger";
              const beatBoth = !house && r.beatJaiye > 0 && r.beatRemi > 0;
              return (
                <tr key={r.player.id} className="border-t border-[var(--color-line)]">
                  <td className="py-2 pr-2 font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <span className={`font-medium ${r.player.kind === "jaiye" ? "text-[var(--color-red)]" : ""}`}>{r.player.display_name}</span>
                    {house ? (
                      <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">Sobo</span>
                    ) : beatBoth ? (
                      <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-games-yellow)]">Beat the Sobos</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 text-right font-[family-name:var(--font-jetbrains)]">{r.points}</td>
                  <td className="py-2 pr-2 text-right font-[family-name:var(--font-jetbrains)]">{r.weeksWon}</td>
                  <td className="py-2 pr-2 text-right font-[family-name:var(--font-jetbrains)] text-[var(--color-mute)]">{house ? "" : r.beatJaiye}</td>
                  <td className="py-2 pr-2 text-right font-[family-name:var(--font-jetbrains)] text-[var(--color-mute)]">{house ? "" : r.beatRemi}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-jetbrains)] text-[var(--color-mute)]">{r.bestWeek}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
