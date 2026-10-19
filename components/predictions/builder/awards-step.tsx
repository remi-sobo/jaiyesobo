"use client";

import { isTeamCode, TEAMS, teamsByCity } from "@/lib/nba/teams";
import { champion } from "@/lib/nba/logic";
import { AWARDS, HOT_TAKE_MAX, type AwardDef, type PredictionPicks } from "@/lib/nba/types";
import type { UpdatePicks } from "./builder";
import { MonoLabel, StepIntro } from "./ui";

const TEAM_OPTIONS = teamsByCity();

const inputClass =
  "h-12 w-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-3 text-[1rem] text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] focus:border-[var(--color-red)] focus:outline-none";

function AwardRow({ def, picks, update }: { def: AwardDef; picks: PredictionPicks; update: UpdatePicks }) {
  const pick = picks.awards[def.key];
  const team = pick?.team ?? null;

  function set(patch: { player?: string; team?: string }) {
    update((p) => {
      const prev = p.awards[def.key] ?? { player: "", team: null };
      const next = {
        player: patch.player ?? prev.player,
        team: patch.team === undefined ? prev.team : isTeamCode(patch.team) ? patch.team : null,
      };
      return { ...p, awards: { ...p.awards, [def.key]: next } };
    }, "awards");
  }

  const placeholder = def.kind === "coach" ? "Coach name" : "Player name";
  const teamPrompt = def.kind === "team" ? "Pick the champion" : def.kind === "coach" ? "Team (optional)" : "Team";

  return (
    <div
      className="border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/40 p-4"
      style={{ borderLeft: `4px solid ${team ? TEAMS[team].primary : "var(--color-line-strong)"}` }}
    >
      <label className="block">
        <MonoLabel className="mb-2 text-[var(--color-bone)]">{def.label}</MonoLabel>
      </label>
      <div className={`grid gap-2 ${def.kind === "team" ? "" : "@min-[560px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"}`}>
        {def.kind !== "team" ? (
          <input
            type="text"
            aria-label={`${def.label} ${placeholder.toLowerCase()}`}
            value={pick?.player ?? ""}
            maxLength={60}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => set({ player: e.target.value })}
            className={inputClass}
          />
        ) : null}
        <select
          aria-label={`${def.label} team`}
          value={team ?? ""}
          onChange={(e) => set({ team: e.target.value })}
          className={inputClass}
        >
          <option value="">{teamPrompt}</option>
          {TEAM_OPTIONS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.city} {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AwardsStep({ picks, update }: { picks: PredictionPicks; update: UpdatePicks }) {
  const champ = champion(picks);
  const hotTake = picks.hot_take;
  return (
    <div>
      <StepIntro title="Hand out the awards." accent="awards.">
        Type a name and pick a team for each one. Finals MVP starts on your champion
        {champ ? ` (${champ})` : ""}, but you can change it.
      </StepIntro>
      <div className="grid gap-3 @min-[900px]:grid-cols-2">
        {AWARDS.map((def) => (
          <AwardRow key={def.key} def={def} picks={picks} update={update} />
        ))}
      </div>

      <div className="mt-8 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/40 p-4">
        <label htmlFor="hot-take">
          <MonoLabel className="mb-2 text-[var(--color-bone)]">My hot take for the season (optional)</MonoLabel>
        </label>
        <input
          id="hot-take"
          type="text"
          value={hotTake}
          maxLength={HOT_TAKE_MAX}
          placeholder="One line. Make it spicy."
          onChange={(e) => update((p) => ({ ...p, hot_take: e.target.value.slice(0, HOT_TAKE_MAX) }), "awards")}
          className={inputClass}
        />
        <div className="mt-1 text-right font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-warm-mute)]">
          {hotTake.length}/{HOT_TAKE_MAX}
        </div>
      </div>
    </div>
  );
}
