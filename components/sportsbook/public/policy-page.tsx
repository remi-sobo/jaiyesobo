/** Shared layout for the privacy, terms, support and parents pages. */
export default function PolicyPage({ title, updated, draft = true, children }: { title: string; updated: string; draft?: boolean; children: React.ReactNode }) {
  return (
    <main className="px-5 py-[clamp(40px,6vw,80px)]">
      <article className="mx-auto max-w-[68ch]">
        {draft ? (
          <p className="mb-8 border border-[var(--color-games-yellow)] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-games-yellow)]">
            Draft. Being reviewed by a lawyer before the iPhone app launches.
          </p>
        ) : null}
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">Run It Back Picks</div>
        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,6vw,3.2rem)] font-black leading-tight">{title}</h1>
        <p className="mt-2 text-[0.85rem] text-[var(--color-mute)]">Last updated {updated}</p>
        <div className="mt-8 flex flex-col gap-5 text-[1rem] leading-relaxed [&_h2]:mt-4 [&_h2]:font-[family-name:var(--font-fraunces)] [&_h2]:text-[1.4rem] [&_h2]:font-black [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </article>
    </main>
  );
}
