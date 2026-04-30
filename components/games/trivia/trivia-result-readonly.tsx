import { TRIVIA_DIFFICULTIES, type TriviaDifficultyKey } from "@/lib/games/trivia-config";
import type { Breakdown } from "./trivia-result";

type Props = {
  score: number;
  total: number;
  difficulty: TriviaDifficultyKey;
  roast: string;
  breakdown: Breakdown[];
};

/** Server-renderable read-only version of TriviaResult for the share view. */
export default function TriviaResultReadOnly({ score, total, difficulty, roast, breakdown }: Props) {
  const cfg = TRIVIA_DIFFICULTIES[difficulty];
  return (
    <div className="max-w-[760px] mx-auto px-6 py-20 lg:py-28">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-6">
        {cfg?.name ?? "Trivia"} · The Court Report
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] gap-12 items-start mb-14 pb-14 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(5rem,12vw,8rem)] leading-none tracking-[-0.04em] text-[var(--color-games-yellow)]">
          {score}
          <span className="text-[var(--color-mute)] font-normal">/{total}</span>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1.25rem,2vw,1.6rem)] leading-snug text-[var(--color-bone)]">
          &ldquo;{roast}&rdquo;
        </p>
      </div>

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-5">
        Round breakdown
      </div>
      <ol className="flex flex-col gap-2 list-none">
        {breakdown.map((b, i) => {
          const wasSkipped = b.selected_index === -1;
          const fg = b.correct
            ? "var(--color-games-green)"
            : wasSkipped
            ? "var(--color-mute)"
            : "var(--color-red)";
          const tag = b.correct ? "Right" : wasSkipped ? "Timed out" : "Wrong";
          return (
            <li
              key={b.question_id || i}
              className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center"
              style={{ borderLeftColor: fg, borderLeftWidth: "2px" }}
            >
              <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[var(--color-mute)] w-6">
                {i + 1}
              </span>
              <span className="font-[family-name:var(--font-fraunces)] text-[0.95rem] leading-snug truncate">
                {b.question}
              </span>
              <span
                className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] whitespace-nowrap"
                style={{ color: fg }}
              >
                {tag}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
