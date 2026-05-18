import GenerateCutSetForm from "@/components/games/the-cut/generate-cut-set-form";

export const dynamic = "force-dynamic";

export default function GenerateCutSetPage() {
  return (
    <main className="max-w-[760px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
          The Cut · Generate
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight mb-3">
          Generate a <span className="italic font-normal text-[var(--color-red)]">cut set.</span>
        </h1>
        <p className="text-[var(--color-warm-mute)] max-w-[58ch] leading-relaxed">
          Give Claude a criterion. It drafts 4 keeps + 4 plausible distractors — you
          verify before it goes live.
        </p>
      </div>
      <GenerateCutSetForm />
    </main>
  );
}
