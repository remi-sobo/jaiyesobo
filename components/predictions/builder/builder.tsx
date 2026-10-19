"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { champion, missingPicks, reconcile, type Missing } from "@/lib/nba/logic";
import type { PredictionPicks } from "@/lib/nba/types";
import StandingsStep from "./standings-step";
import PlayInStep from "./play-in-step";
import PlayoffsStep from "./playoffs-step";
import AwardsStep from "./awards-step";
import ReviewStep from "./review-step";

export type StepId = "standings" | "playin" | "playoffs" | "awards" | "review";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "standings", label: "Standings" },
  { id: "playin", label: "Play-In" },
  { id: "playoffs", label: "Playoffs" },
  { id: "awards", label: "Awards" },
  { id: "review", label: "Review" },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Which step a change came from, so the cascade notice can say why picks were cleared. */
export type ChangeSource = "standings" | "playin" | "playoffs" | "awards";

export type UpdatePicks = (fn: (prev: PredictionPicks) => PredictionPicks, source: ChangeSource) => void;

function clearedNotice(source: ChangeSource, playIn: number, bracket: number): string | null {
  if (playIn === 0 && bracket === 0) return null;
  if (source === "standings") {
    if (playIn > 0 && bracket > 0) return "Your standings changed, so some play-in and playoff picks were cleared.";
    if (playIn > 0) return "Your standings changed, so some play-in picks were cleared.";
    return "Your standings changed, so some playoff picks were cleared.";
  }
  if (source === "playin") return "Your play-in picks changed, so some playoff picks were cleared.";
  return "That changed who made it to later rounds, so some series were cleared.";
}

const SAVE_DELAY_MS = 800;

export default function PredictionBuilder({
  season,
  ownerName,
  initialPicks,
}: {
  season: string;
  ownerName: string;
  initialPicks: PredictionPicks;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<PredictionPicks>(initialPicks);
  const [step, setStep] = useState<StepId>("standings");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [locked, setLocked] = useState(false);
  const [retries, setRetries] = useState(0);

  const latest = useRef(picks);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Wait for any save already on the wire so they land in order.
    if (inflight.current) await inflight.current;
    if (!dirty.current) return true;
    dirty.current = false;
    setSaveStatus("saving");
    const run = (async () => {
      try {
        const res = await fetch("/api/admin/predictions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ season, picks: latest.current }),
        });
        if (res.status === 409) {
          setLocked(true);
          setSaveStatus("idle");
          return false;
        }
        if (!res.ok) throw new Error(String(res.status));
        setSaveStatus("saved");
        return true;
      } catch {
        dirty.current = true;
        setSaveStatus("error");
        setRetries((n) => n + 1);
        return false;
      }
    })();
    inflight.current = run;
    const ok = await run;
    inflight.current = null;
    return ok;
  }, [season]);

  // A failed save tries again on its own a few seconds later.
  useEffect(() => {
    if (retries === 0) return;
    const t = setTimeout(() => void save(), 5000);
    return () => clearTimeout(t);
  }, [retries, save]);

  const update: UpdatePicks = useCallback(
    (fn, source) => {
      const prev = latest.current;
      const raw = fn(prev);
      const { picks: next, cleared } = reconcile(raw);

      // Finals MVP defaults to his champion. If the champion changes and the
      // team was still the old default, follow along. A team he picked by
      // hand stays put.
      const oldChamp = champion(prev);
      const newChamp = champion(next);
      if (newChamp && newChamp !== oldChamp) {
        const fmvp = next.awards.finals_mvp;
        if (!fmvp?.team || fmvp.team === oldChamp) {
          next.awards = { ...next.awards, finals_mvp: { player: fmvp?.player ?? "", team: newChamp } };
        }
      }

      const msg = clearedNotice(source, cleared.playIn, cleared.bracket);
      if (msg) setNotice(msg);

      latest.current = next;
      dirty.current = true;
      setPicks(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
    },
    [save],
  );

  // If he closes the tab mid debounce, send what we have.
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      dirty.current = false;
      void fetch("/api/admin/predictions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, picks: latest.current }),
        keepalive: true,
      });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [season]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  function go(id: StepId) {
    setStep(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const missing = missingPicks(picks);
  const stepMissing = (id: StepId) => missing.filter((m: Missing) => m.step === id).length;
  const index = STEPS.findIndex((s) => s.id === step);

  if (locked) {
    return (
      <div className="border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] p-6">
        <p className="text-[var(--color-bone)]">These picks are already locked in.</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-red)]"
        >
          Show my locked picks
        </button>
      </div>
    );
  }

  return (
    <div className="@container">
      {/* Stepper */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-[var(--color-line)] bg-[var(--color-warm-bg)]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <ol className="flex gap-1">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const left = s.id === "standings" || s.id === "review" ? 0 : stepMissing(s.id);
            const done = s.id !== "review" && left === 0 && i < index;
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full flex-col items-start gap-1 border-t-2 px-1 pt-2 text-left transition-colors ${
                    active
                      ? "border-[var(--color-red)] text-[var(--color-bone)]"
                      : done
                        ? "border-[var(--color-warm-mute)] text-[var(--color-warm-mute)]"
                        : "border-[var(--color-line-strong)] text-[var(--color-warm-mute)]"
                  }`}
                >
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-[0.15em]">
                    {done ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-[0.78rem] font-medium sm:text-[0.82rem]">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 flex justify-end">
          <SaveLabel status={saveStatus} />
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className="mt-4 flex items-start justify-between gap-4 border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-4 py-3 text-[0.9rem] text-[var(--color-bone)]"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-[var(--color-warm-mute)]">
            ✕
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        {step === "standings" && <StandingsStep picks={picks} update={update} />}
        {step === "playin" && <PlayInStep picks={picks} update={update} />}
        {step === "playoffs" && <PlayoffsStep picks={picks} update={update} />}
        {step === "awards" && <AwardsStep picks={picks} update={update} />}
        {step === "review" && (
          <ReviewStep
            picks={picks}
            season={season}
            ownerName={ownerName}
            missing={missing}
            go={go}
            flush={save}
            onPublished={() => router.refresh()}
          />
        )}
      </div>

      {/* Back / next */}
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-6">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(STEPS[index - 1].id)}
            className="min-h-12 border border-[var(--color-line-strong)] px-5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-bone)] hover:border-[var(--color-red)]"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {index < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => go(STEPS[index + 1].id)}
            className="min-h-12 bg-[var(--color-red)] px-6 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] hover:bg-[var(--color-bone)]"
          >
            Next: {STEPS[index + 1].label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SaveLabel({ status }: { status: SaveStatus }) {
  const label =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Retrying…" : "";
  return (
    <span
      className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] ${
        status === "error" ? "text-[var(--color-red-soft)]" : "text-[var(--color-warm-mute)]"
      }`}
    >
      {label || " "}
    </span>
  );
}
