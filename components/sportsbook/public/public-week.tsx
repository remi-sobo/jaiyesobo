import type { Board, SeasonSummary } from "@/lib/sportsbook/data";
import type { ReactionMap } from "@/lib/sportsbook/fans";
import type { SbItem, SbPick, SbPlayer } from "@/lib/sportsbook/types";
import { CardHead, CardPrompt, ResultLine, TeamDot, Who, isLocked, isWinningOption } from "../card-parts";
import { ReactionBar } from "./fan-bits";

type House = { jaiye: SbPlayer | undefined; remi: SbPlayer | undefined };

export function ScoreHeader({ board, house, label }: { board: Board[]; house: House; label: string }) {
  const pts = (p: SbPlayer | undefined) => board.find((b) => b.player.id === p?.id)?.score.points ?? 0;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">{label}</div>
      <div className="flex items-baseline gap-4 font-[family-name:var(--font-fraunces)] font-black leading-none tracking-[-0.03em]">
        <span className="text-[clamp(2rem,6vw,3.6rem)] text-[var(--color-red)]">JAIYE {pts(house.jaiye)}</span>
        <span className="text-[1.4rem] text-[var(--color-mute)]">·</span>
        <span className="text-[clamp(2rem,6vw,3.6rem)]">REMI {pts(house.remi)}</span>
      </div>
    </div>
  );
}

function HousePick({
  item,
  player,
  pick,
  tone,
  reactions,
  allPicks,
}: {
  item: SbItem;
  player: SbPlayer | undefined;
  pick: SbPick | undefined;
  tone: "jaiye" | "remi";
  reactions: ReactionMap;
  allPicks: SbPick[];
}) {
  if (!player) return null;
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
  const revealed = isLocked(item, now) || item.status !== "open";
  const mine = picks.filter((p) => p.item_id === item.id);
  const challengerIds = new Set(players.filter((p) => p.kind === "challenger").map((p) => p.id));
  const crowd = mine.filter((p) => challengerIds.has(p.player_id) && p.choice !== null);
  return (
    <div className="flex flex-col border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-4">
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
                {revealed && share !== null ? (
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-mute)]">{share}%</span>
                ) : null}
                {won ? <span className="text-[var(--color-green)]">✓</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-1 flex-col justify-end gap-2">
        {revealed ? (
          <>
            <HousePick item={item} player={house.jaiye} pick={mine.find((p) => p.player_id === house.jaiye?.id)} tone="jaiye" reactions={reactions} allPicks={picks} />
            <HousePick item={item} player={house.remi} pick={mine.find((p) => p.player_id === house.remi?.id)} tone="remi" reactions={reactions} allPicks={picks} />
            {crowd.length ? (
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">
                % = what {crowd.length} {crowd.length === 1 ? "challenger" : "challengers"} picked
              </div>
            ) : null}
          </>
        ) : (
          <div className="border-t border-[var(--color-line)] pt-2 text-[0.82rem] text-[var(--color-mute)]">
            Picks stay hidden until tip-off. No copying.
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

export function WeekBoard({ board, limit = 10 }: { board: Board[]; limit?: number }) {
  if (board.length === 0) return <p className="text-[0.9rem] text-[var(--color-mute)]">No picks yet.</p>;
  const jaiye = board.find((b) => b.player.kind === "jaiye")?.score.points;
  const challengers = board.filter((b) => b.player.kind === "challenger");
  const beatJaiye = jaiye === undefined ? 0 : challengers.filter((b) => b.score.points > jaiye).length;
  return (
    <div>
      {challengers.length ? (
        <p className="mb-3 text-[0.9rem] text-[var(--color-mute)]">
          {beatJaiye} of {challengers.length} {challengers.length === 1 ? "challenger is" : "challengers are"} beating Jaiye.
        </p>
      ) : null}
      <ol>
        {board.slice(0, limit).map((b, i) => (
          <li key={b.player.id} className="flex items-center gap-3 border-t border-[var(--color-line)] py-2">
            <span className="w-5 text-right font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">{i + 1}</span>
            <span className={`flex-1 font-medium ${b.player.kind === "jaiye" ? "text-[var(--color-red)]" : ""}`}>
              {b.player.display_name}
              {b.player.kind !== "challenger" ? (
                <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-mute)]">Sobo</span>
              ) : null}
            </span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-mute)]">
              {b.score.correct}-{b.score.wrong}
            </span>
            <span className="w-10 text-right font-[family-name:var(--font-jetbrains)]">{b.score.points}</span>
          </li>
        ))}
      </ol>
      {board.length > limit ? <p className="mt-2 text-[0.8rem] text-[var(--color-mute)]">and {board.length - limit} more</p> : null}
    </div>
  );
}
