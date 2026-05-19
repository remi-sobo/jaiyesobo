import type { BlindRankResult } from "@/lib/games/blind-rank";

type Props = {
  result: BlindRankResult;
};

export default function BlindRankShareView({ result }: Props) {
  const isOpinion = result.kind === "opinion";
  const scoreNumber = isOpinion ? result.take_score : result.score;
  const scoreMax = isOpinion ? 100 : result.total_slots;
  const scoreColor = isOpinion
    ? opinionScoreColor(result.take_score)
    : factualScoreColor(result.score);

  return (
    <section className="px-6 lg:px-10 pt-16 pb-12 max-w-[920px] mx-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-3">
        Blind Rank · {result.topic_title}
        {isOpinion && (
          <span className="ml-2 text-[var(--color-games-yellow)]">· Opinion</span>
        )}
      </div>
      {result.topic_subtitle && (
        <p className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1rem,1.5vw,1.25rem)] text-[var(--color-mute)] mb-6">
          {result.topic_subtitle}
        </p>
      )}

      <div className="flex items-baseline gap-5 mb-6 flex-wrap">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3.5rem,10vw,7rem)] leading-none tracking-tight">
          <span style={{ color: scoreColor }}>{scoreNumber}</span>
          <span className="text-[var(--color-mute)] text-[0.55em]">/{scoreMax}</span>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.3rem,3vw,2.2rem)] leading-snug text-[var(--color-bone)]">
          &ldquo;{result.verdict_line}&rdquo;
        </p>
      </div>

      {isOpinion && result.overall_take && (
        <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1rem,1.5vw,1.2rem)] leading-snug text-[var(--color-mute)] mb-8 max-w-[60ch]">
          {result.overall_take}
        </p>
      )}

      <div className="bg-[var(--color-card)] border border-[var(--color-line)] rounded p-5">
        <div className="grid grid-cols-[40px_1fr_1fr] gap-3 mb-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          <span>#</span>
          <span>You</span>
          <span>{isOpinion ? "Mike" : "Truth"}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {isOpinion
            ? result.slot_reactions.map((sr) => (
                <li
                  key={sr.slot}
                  className="grid grid-cols-[40px_1fr_1fr] gap-3 items-start p-3 rounded border border-[var(--color-games-yellow)] bg-[rgba(245,200,66,0.08)]"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full font-[family-name:var(--font-fraunces)] font-black bg-[var(--color-games-yellow)] text-[var(--color-black)]">
                    {sr.slot}
                  </div>
                  <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                    {sr.player_name}
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                      {sr.ai_name}
                    </div>
                    <div className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] leading-relaxed text-[var(--color-bone)] mt-1">
                      &ldquo;{sr.ai_take}&rdquo;
                    </div>
                  </div>
                </li>
              ))
            : result.slot_results.map((sr) => {
                const fact = result.all_facts.find((f) => f.name === sr.ai_name);
                return (
                  <li
                    key={sr.slot}
                    className={`grid grid-cols-[40px_1fr_1fr] gap-3 items-start p-3 rounded border ${
                      sr.correct
                        ? "border-[var(--color-games-green)] bg-[rgba(62,207,178,0.08)]"
                        : "border-[var(--color-red)] bg-[rgba(230,57,70,0.08)]"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full font-[family-name:var(--font-fraunces)] font-black ${
                        sr.correct
                          ? "bg-[var(--color-games-green)] text-[var(--color-black)]"
                          : "bg-[var(--color-red)] text-[var(--color-bone)]"
                      }`}
                    >
                      {sr.slot}
                    </div>
                    <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                      {sr.player_name}
                    </div>
                    <div>
                      <div className="font-[family-name:var(--font-fraunces)] text-base leading-tight text-[var(--color-bone)]">
                        {sr.ai_name}
                      </div>
                      {fact && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] leading-relaxed text-[var(--color-mute)] mt-1">
                          {fact.fact}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}

function factualScoreColor(score: number): string {
  if (score === 5) return "var(--color-games-green)";
  if (score >= 3) return "var(--color-games-yellow)";
  if (score === 0) return "var(--color-red)";
  return "var(--color-bone)";
}

function opinionScoreColor(score: number): string {
  if (score >= 80) return "var(--color-games-green)";
  if (score >= 55) return "var(--color-games-yellow)";
  if (score >= 30) return "var(--color-bone)";
  return "var(--color-red)";
}
