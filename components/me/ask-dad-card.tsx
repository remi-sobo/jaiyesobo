type Props = { pendingCount: number };

export default function AskDadCard({ pendingCount }: Props) {
  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center p-8 bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded">{/* mt-12 per mockup — 3rem from Dad's note above */}
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.4rem] tracking-[-0.01em] mb-1.5">
          Got a <span className="italic font-normal text-[var(--color-red)]">question?</span>
        </h3>
        <p className="text-[0.9rem] leading-relaxed text-[var(--color-warm-mute)]">
          {pendingCount > 0
            ? `You have ${pendingCount} waiting for Dad. He'll get to them as soon as he can.`
            : "If Dad's in a meeting, drop it here and he'll get back to you. Don't interrupt him."}
        </p>
      </div>
      {/* TODO: next session — wire question submission */}
      <button
        type="button"
        className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em] px-6 py-3.5 rounded-sm bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-soft)] hover:-translate-y-px transition-all whitespace-nowrap"
      >
        Ask Dad
      </button>
    </div>
  );
}
