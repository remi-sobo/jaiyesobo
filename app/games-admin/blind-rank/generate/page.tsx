import GenerateBlindRankForm from "@/components/games/blind-rank/generate-form";

export const dynamic = "force-dynamic";

export default function GenerateBlindRankPage() {
  return (
    <main className="max-w-[760px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
          Blind Rank · Generate
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight mb-3">
          Generate a <span className="italic font-normal text-[var(--color-red)]">topic.</span>
        </h1>
        <p className="text-[var(--color-warm-mute)] max-w-[58ch] leading-relaxed">
          Give Claude a topic + the criteria it should rank by. It drafts an
          authoritative top-10 — you verify the order before it goes live.
        </p>
      </div>
      <GenerateBlindRankForm />
    </main>
  );
}
