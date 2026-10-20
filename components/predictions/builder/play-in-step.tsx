"use client";

import { playInGames, SIDE_LABEL } from "@/lib/nba/logic";
import type { PredictionPicks, Side } from "@/lib/nba/types";
import { TeamChip } from "../team-tile";
import type { UpdatePicks } from "./builder";
import PickButton from "./pick-button";
import { MonoLabel, StepIntro } from "./ui";

function SideCard({ picks, side, update }: { picks: PredictionPicks; side: Side; update: UpdatePicks }) {
  const games = playInGames(picks, side);
  const seed7 = games[0].winner;
  const seed8 = games[2].winner;
  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/40 p-4">
      <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl font-black tracking-[-0.02em]">
        {SIDE_LABEL[side]}
      </h2>
      <div className="flex flex-col gap-5">
        {games.map((g) => {
          const ready = !!g.a && !!g.b;
          return (
            <div key={g.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <MonoLabel className="text-[var(--color-bone)]">{g.label}</MonoLabel>
                <span className="text-right text-[0.78rem] text-[var(--color-warm-mute)]">{g.note}</span>
              </div>
              {ready ? (
                <div className="grid grid-cols-2 gap-2">
                  {[g.a, g.b].map((slot) => (
                    <PickButton
                      key={slot!.code}
                      slot={slot}
                      picked={g.winner === slot!.code}
                      decided={!!g.winner}
                      onPick={() =>
                        update((p) => ({ ...p, play_in: { ...p.play_in, [g.key]: { winner: slot!.code } } }), "playin")
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-14 items-center border border-dashed border-[var(--color-line-strong)] px-3 text-[0.85rem] text-[var(--color-warm-mute)]">
                  Pick Games 1 and 2 first.
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[var(--color-line)] pt-4">
        {[
          { seed: 7, code: seed7 },
          { seed: 8, code: seed8 },
        ].map((s) => (
          <div key={s.seed} className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
              {s.seed} seed
            </span>
            {s.code ? (
              <TeamChip code={s.code} />
            ) : (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-dim)]">TBD</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayInStep({ picks, update }: { picks: PredictionPicks; update: UpdatePicks }) {
  return (
    <div>
      <StepIntro title="Who gets out of the Play-In?" accent="Play-In?">
        Teams 7 to 10 fight for the last two playoff spots. Tap who wins each game.
      </StepIntro>
      <div className="grid grid-cols-1 gap-6 @min-[760px]:grid-cols-2">
        <SideCard picks={picks} side="W" update={update} />
        <SideCard picks={picks} side="E" update={update} />
      </div>
    </div>
  );
}
