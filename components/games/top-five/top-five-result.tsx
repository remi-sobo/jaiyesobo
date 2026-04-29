import type { TopFiveVerdict } from "@/lib/games/top-five-types";

type Props = {
  prompt: string;
  picks: string[];
  verdict: TopFiveVerdict;
};

const VERDICT_STYLES: Record<TopFiveVerdict["per_pick"][number]["verdict"], { fg: string; bg: string; label: string }> = {
  based: { fg: "var(--color-games-green)", bg: "rgba(62,207,178,0.14)", label: "Based" },
  reach: { fg: "var(--color-games-yellow)", bg: "rgba(245,200,66,0.14)", label: "Reach" },
  interesting: { fg: "var(--color-bone)", bg: "rgba(245,241,234,0.10)", label: "Interesting" },
  disrespectful: { fg: "var(--color-red-bright)", bg: "rgba(255,45,61,0.14)", label: "Disrespectful" },
  cap: { fg: "var(--color-red)", bg: "rgba(230,57,70,0.14)", label: "Cap" },
};

export default function TopFiveResult({ prompt, picks, verdict }: Props) {
  return (
    <div className="max-w-[860px] mx-auto px-6 py-24 lg:py-32">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-8">
        {prompt}
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] gap-12 sm:gap-16 items-start mb-16 pb-16 border-b border-[var(--color-line)]">
        <div className="flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-fraunces)] font-black text-[6rem] leading-none tracking-[-0.04em] text-[var(--color-games-yellow)]">
            {verdict.rating}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mt-3">
            of 10
          </div>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.2rem,1.7vw,1.5rem)] leading-snug text-[var(--color-bone)]">
          &ldquo;{verdict.take}&rdquo;
        </p>
      </div>

      <ol className="flex flex-col gap-5 list-none">
        {picks.map((name, i) => {
          const pickVerdict = verdict.per_pick[i];
          const styles = pickVerdict ? VERDICT_STYLES[pickVerdict.verdict] : null;
          return (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] gap-5 items-center bg-[var(--color-card)] border border-[var(--color-line)] rounded px-6 py-5"
            >
              <span className="font-[family-name:var(--font-fraunces)] font-black text-3xl text-[var(--color-mute)] leading-none w-8">
                {i + 1}
              </span>
              <span className="font-[family-name:var(--font-fraunces)] text-[1.15rem] tracking-[-0.005em] truncate">
                {name}
              </span>
              {styles && (
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm whitespace-nowrap"
                  style={{ background: styles.bg, color: styles.fg }}
                >
                  {styles.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
