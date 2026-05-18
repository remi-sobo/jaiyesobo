import type { CutGameMode } from "@/lib/games/the-cut";

type Props = {
  mode: CutGameMode;
  prompt: string;
  setTitle: string;
};

export default function CriterionBanner({ mode, prompt, setTitle }: Props) {
  return (
    <div className="px-6 lg:px-10 pt-12 pb-8 max-w-[1100px] mx-auto text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-mute)] mb-3">
        {mode === "easy" ? setTitle : "The Cut"}
      </div>
      <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(1.3rem,2.4vw,2rem)] leading-snug text-[var(--color-bone)] max-w-[56ch] mx-auto">
        {prompt}
      </p>
    </div>
  );
}
