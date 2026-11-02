"use client";
import { useState } from "react";
import Reveal from "@/components/site/reveal";
import type { HistoryThread, HistoryUnit, ThreadId } from "@/lib/content/history";

const mono =
  "font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.2em]";

/**
 * The threads grid and the unit-by-unit list, wired together: tapping a
 * thread dims every unit it doesn't show up in. Everything else on /history
 * is static, so only this part is a client component.
 */
export default function HistoryBrowser({
  threads,
  units,
}: {
  threads: HistoryThread[];
  units: HistoryUnit[];
}) {
  const [active, setActive] = useState<ThreadId | null>(null);
  const byId = new Map(threads.map((t) => [t.id, t]));
  const done = units.filter((u) => u.status !== "next");
  const count = (id: ThreadId) =>
    done.filter((u) => u.threads.includes(id)).length;

  function pick(id: ThreadId) {
    const next = active === id ? null : id;
    setActive(next);
    if (next) {
      document.getElementById("units")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }

  let n = 0;

  return (
    <>
      <section className="border-b border-[var(--color-line)] py-[clamp(48px,6vw,80px)]">
        <div className="grid gap-3 min-[860px]:grid-cols-[200px_1fr] min-[860px]:gap-7">
          <div className={`${mono} text-[0.7rem] text-[var(--color-red)]`}>
            <span className="mr-3 inline-block h-px w-8 bg-[var(--color-red)] align-middle" />
            Questions we keep asking
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4.4vw,3.4rem)] font-black leading-none tracking-[-0.025em]">
            The <em className="font-normal italic text-[var(--color-red)]">threads.</em>
          </h2>
        </div>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {threads.map((t) => {
            const on = active === t.id;
            const c = count(t.id);
            return (
              <Reveal key={t.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(t.id)}
                  className={`block h-full w-full cursor-pointer border p-5 text-left transition-colors duration-200 ${
                    on
                      ? "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]"
                      : "border-[var(--color-line-strong)] bg-[var(--color-card)] text-[var(--color-bone)] hover:border-[var(--color-red)]"
                  }`}
                >
                  <div className="font-[family-name:var(--font-fraunces)] text-[1.3rem] font-black leading-[1.1] tracking-[-0.01em]">
                    {t.name}
                  </div>
                  <div
                    className={`mt-2 text-[0.95rem] leading-[1.45] ${
                      on ? "text-[var(--color-black)]/85" : "text-[var(--color-mute)]"
                    }`}
                  >
                    {t.text}
                  </div>
                  <div
                    className={`${mono} mt-3 text-[0.6rem] tracking-[0.14em] ${
                      on ? "text-[var(--color-black)]/85" : "text-[var(--color-red)]"
                    }`}
                  >
                    {c} {c === 1 ? "unit" : "units"}
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-5 min-h-[22px] text-[0.9rem] text-[var(--color-mute)]" aria-live="polite">
          {active ? (
            <>
              Showing units with{" "}
              <b className="font-semibold text-[var(--color-bone)]">{byId.get(active)?.name}</b>.{" "}
              <button
                type="button"
                onClick={() => setActive(null)}
                className="cursor-pointer underline underline-offset-4 text-[var(--color-red)]"
              >
                Show all
              </button>
            </>
          ) : (
            "Tap a thread to see every unit it shows up in."
          )}
        </p>
      </section>

      <section id="units" className="scroll-mt-20 border-b border-[var(--color-line)] py-[clamp(48px,6vw,80px)]">
        <div className="grid gap-3 min-[860px]:grid-cols-[200px_1fr] min-[860px]:gap-7">
          <div className={`${mono} text-[0.7rem] text-[var(--color-red)]`}>
            <span className="mr-3 inline-block h-px w-8 bg-[var(--color-red)] align-middle" />
            Unit by unit
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4.4vw,3.4rem)] font-black leading-none tracking-[-0.025em]">
            What we <em className="font-normal italic text-[var(--color-red)]">learned.</em>
          </h2>
        </div>

        <div className="mt-7">
          {units.map((u) => {
            const isNext = u.status === "next";
            if (!isNext) n++;
            const num = isNext ? "Up" : String(n).padStart(2, "0");
            const dim = active !== null && !u.threads.includes(active);
            return (
              <Reveal key={u.title}>
                <article
                  className={`grid gap-2.5 border-t border-[var(--color-line)] py-10 transition-opacity duration-250 min-[860px]:grid-cols-[200px_1fr] min-[860px]:gap-7 ${
                    dim ? "opacity-[0.18]" : "opacity-100"
                  }`}
                >
                  <div>
                    <div
                      className={`font-[family-name:var(--font-fraunces)] text-[2.75rem] font-black leading-[0.9] tracking-[-0.03em] min-[860px]:text-[4rem] ${
                        isNext ? "text-[var(--color-mute)]" : "text-[var(--color-red)]"
                      }`}
                    >
                      {num}
                    </div>
                    <div className={`${mono} mt-2.5 text-[0.7rem] tracking-[0.16em] text-[var(--color-mute)]`}>
                      {u.when}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.75rem,3.4vw,2.6rem)] font-black leading-[1.02] tracking-[-0.02em]">
                      {u.title}
                      {isNext && (
                        <span
                          className={`${mono} ml-3 inline-block rounded-full bg-[var(--color-red)] px-2.5 py-1 align-middle text-[0.6rem] font-normal tracking-[0.14em] text-[var(--color-black)]`}
                        >
                          Next
                        </span>
                      )}
                    </h3>
                    <p className="mt-3 max-w-[44ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.1rem,2vw,1.45rem)] italic leading-[1.35]">
                      {u.bigIdea}
                    </p>

                    <ul className="mt-5 max-w-[70ch] list-none">
                      {u.facts.map((f) => (
                        <li
                          key={f}
                          className="relative border-t border-[var(--color-line)] py-2.5 pl-6.5 text-[1rem] leading-[1.5] before:absolute before:left-0.5 before:top-[19px] before:h-0.5 before:w-3 before:bg-[var(--color-red)] before:content-['']"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>

                    {(u.argued || u.made) && (
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {u.argued && (
                          <div className="bg-[var(--color-off-black)] px-4 py-3.5">
                            <span className={`${mono} mb-1.5 block text-[0.65rem] text-[var(--color-red)]`}>
                              What we argued
                            </span>
                            <p className="text-[0.95rem] leading-[1.5]">{u.argued}</p>
                          </div>
                        )}
                        {u.made && (
                          <div className="bg-[var(--color-off-black)] px-4 py-3.5">
                            <span className={`${mono} mb-1.5 block text-[0.65rem] text-[var(--color-red)]`}>
                              What we made
                            </span>
                            <p className="text-[0.95rem] leading-[1.5]">{u.made}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4.5 flex flex-wrap gap-2">
                      {u.threads.map((id) => {
                        const t = byId.get(id);
                        return t ? (
                          <span
                            key={id}
                            className={`${mono} rounded-full border border-[var(--color-line-strong)] px-2.5 py-1 text-[0.6rem] tracking-[0.12em] text-[var(--color-mute)]`}
                          >
                            {t.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
