import type { CutPlayResult } from "@/lib/games/the-cut";

type Props = {
  result: CutPlayResult;
};

export default function TheCutShareView({ result }: Props) {
  const correctSet = new Set(result.correct_keeps);
  const wrongSet = new Set(result.wrong_keeps);
  const missedSet = new Set(result.missed_keeps);

  return (
    <section className="px-6 lg:px-10 pt-16 pb-12 max-w-[920px] mx-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-4">
        The Cut · {result.set_title}
      </div>
      <div className="flex items-baseline gap-5 mb-6 flex-wrap">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3.5rem,10vw,7rem)] leading-none tracking-tight">
          <span style={{ color: scoreColor(result.score) }}>{result.score}</span>
          <span className="text-[var(--color-mute)] text-[0.55em]">/{result.total_keeps}</span>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.3rem,3vw,2.2rem)] leading-snug text-[var(--color-bone)]">
          {result.verdict_line}
        </p>
      </div>

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-games-yellow)] mb-2">
        Criterion
      </div>
      <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.05rem,1.8vw,1.4rem)] leading-snug text-[var(--color-bone)] mb-10">
        {result.criterion_summary}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {result.all_items_with_facts.map((item) => {
          const status = classify(item.name, item.is_keep, correctSet, wrongSet, missedSet);
          const tone = TONES[status];
          return (
            <div
              key={item.name}
              className="rounded p-4 transition-all"
              style={{
                background: tone.bg,
                border: `2px solid ${tone.border}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em]"
                  style={{ color: tone.label }}
                >
                  {tone.tag}
                </span>
                <span className="text-lg leading-none" style={{ color: tone.label }}>
                  {tone.icon}
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1rem,2vw,1.25rem)] leading-tight tracking-tight text-[var(--color-bone)] mb-2">
                {item.name}
              </h3>
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] leading-relaxed text-[var(--color-mute)]">
                {item.fact}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type Status = "correct_keep" | "wrong_keep" | "missed_keep" | "correct_cut";

function classify(
  name: string,
  wasKeep: boolean,
  correct: Set<string>,
  wrong: Set<string>,
  missed: Set<string>
): Status {
  if (correct.has(name)) return "correct_keep";
  if (wrong.has(name)) return "wrong_keep";
  if (missed.has(name)) return "missed_keep";
  void wasKeep;
  return "correct_cut";
}

const TONES: Record<
  Status,
  { bg: string; border: string; label: string; tag: string; icon: string }
> = {
  correct_keep: {
    bg: "rgba(62,207,178,0.10)",
    border: "var(--color-games-green)",
    label: "var(--color-games-green)",
    tag: "Kept · correct",
    icon: "✓",
  },
  wrong_keep: {
    bg: "rgba(230,57,70,0.12)",
    border: "var(--color-red)",
    label: "var(--color-red)",
    tag: "Kept · wrong",
    icon: "✗",
  },
  missed_keep: {
    bg: "rgba(245,200,66,0.12)",
    border: "var(--color-games-yellow)",
    label: "var(--color-games-yellow)",
    tag: "Missed it",
    icon: "!",
  },
  correct_cut: {
    bg: "transparent",
    border: "var(--color-line-strong)",
    label: "var(--color-mute)",
    tag: "Cut · correct",
    icon: "·",
  },
};

function scoreColor(score: number): string {
  if (score === 4) return "var(--color-games-green)";
  if (score >= 2) return "var(--color-games-yellow)";
  return "var(--color-red)";
}
