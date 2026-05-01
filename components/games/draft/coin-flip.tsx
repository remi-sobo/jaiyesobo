"use client";

import { useEffect, useState } from "react";
import type { DraftSide } from "@/lib/draft-game";
import type { DraftTeamPayload } from "@/lib/draft-data";

type Props = {
  team: DraftTeamPayload;
  starts: DraftSide;
  onDone: () => void;
  /** When provided, used instead of "You"/"Claude" — for 2-player friend mode. */
  humanName?: string;
  aiName?: string;
};

export default function CoinFlip({ team, starts, onDone, humanName, aiName }: Props) {
  const [phase, setPhase] = useState<"flipping" | "revealed">("flipping");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("revealed"), 1500);
    const t2 = setTimeout(() => onDone(), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  const startName = starts === "human" ? humanName : aiName;
  const showCustom = !!startName;
  const youGoFirst = !showCustom && starts === "human";

  return (
    <div className="max-w-[700px] mx-auto px-6 py-24 lg:py-32 text-center">
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] mb-8"
        style={{ color: team.primary_color }}
      >
        {team.abbreviation} · {team.city} {team.name}
      </div>

      {phase === "flipping" ? (
        <>
          <div className="mb-8 inline-block">
            <div
              className="w-24 h-24 rounded-full border-4 animate-spin"
              style={{
                borderColor: `${team.primary_color} transparent ${team.primary_color} transparent`,
              }}
            />
          </div>
          <p className="font-[family-name:var(--font-fraunces)] italic text-2xl text-[var(--color-mute)]">
            Flipping for first pick…
          </p>
        </>
      ) : (
        <>
          <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.02em] mb-4">
            {showCustom ? (
              <>
                <span className="text-[var(--color-bone)]">{startName}</span> goes{" "}
                <span className="italic font-normal text-[var(--color-red)]">first.</span>
              </>
            ) : youGoFirst ? (
              <>
                You go <span className="italic font-normal text-[var(--color-red)]">first.</span>
              </>
            ) : (
              <>
                Claude goes <span className="italic font-normal text-[var(--color-red)]">first.</span>
              </>
            )}
          </h1>
          <p className="text-[var(--color-mute)] text-lg">Snake draft. 5 picks each. Good luck.</p>
        </>
      )}
    </div>
  );
}
