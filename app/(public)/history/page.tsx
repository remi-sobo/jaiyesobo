import type { Metadata } from "next";
import { history } from "@/lib/content/history";
import { SectionLabel } from "@/components/site/type";
import Reveal from "@/components/site/reveal";
import HistoryBrowser from "@/components/history/history-browser";

export const metadata: Metadata = {
  title: `History · ${history.year} · Jaiye Sobo`,
  description: history.question,
};

export default function HistoryPage() {
  return (
    <main className="px-5 min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <header className="border-b border-[var(--color-line)] pb-14 pt-[clamp(44px,6vw,88px)]">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
            History · {history.year}
          </div>

          <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(3.25rem,9vw,8rem)] font-black leading-[0.92] tracking-[-0.035em]">
            {history.title}
            <br />
            <em className="font-normal italic text-[var(--color-red)]">{history.titleEm}</em>
          </h1>

          <p className="mt-6 max-w-[30ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.25rem,2.6vw,1.9rem)] italic leading-[1.3]">
            {history.question}
          </p>

          <p className="mt-4 max-w-[60ch] text-[1.05rem] leading-[1.6] text-[var(--color-mute)]">
            {history.intro}
          </p>
        </header>

        <section className="border-b border-[var(--color-line)] py-[clamp(48px,6vw,80px)]">
          <div className="grid gap-3 min-[860px]:grid-cols-[200px_1fr] min-[860px]:gap-7">
            <SectionLabel tone="red">The through line</SectionLabel>
            <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4.4vw,3.4rem)] font-black leading-none tracking-[-0.025em]">
              The <em className="font-normal italic text-[var(--color-red)]">arc.</em>
            </h2>
          </div>

          <ol className="mt-7 list-none">
            {history.arc.map((line, i) => {
              const last = i === history.arc.length - 1;
              return (
                <Reveal key={line}>
                  <li
                    className={`grid gap-2.5 border-t border-[var(--color-line)] py-4 text-[clamp(1.05rem,1.7vw,1.3rem)] leading-[1.45] min-[860px]:grid-cols-[200px_1fr] min-[860px]:gap-7 ${
                      last ? "text-[var(--color-red)]" : ""
                    }`}
                  >
                    <span className="pt-1.5 font-[family-name:var(--font-jetbrains)] text-[0.8rem] text-[var(--color-mute)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{line}</span>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </section>

        <HistoryBrowser threads={history.threads} units={history.units} />

        <p className="py-14 text-[0.9rem] text-[var(--color-mute)]">
          <b className="font-semibold text-[var(--color-bone)]">
            Roots &amp; Wings · History · {history.year}
          </b>
          <br />
          A new unit gets added after every Thursday lesson.
        </p>
      </div>
    </main>
  );
}
