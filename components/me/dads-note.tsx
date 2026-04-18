type Props = { body: string };

export default function DadsNote({ body }: Props) {
  return (
    <div className="mt-12 px-7 py-6 flex gap-5 items-start rounded bg-gradient-to-br from-[var(--color-warm-surface-2)] to-[var(--color-warm-surface)] border border-[var(--color-line)]">
      <div className="w-8 h-8 rounded-full bg-[var(--color-red)] flex items-center justify-center shrink-0 font-[family-name:var(--font-fraunces)] font-black text-sm text-[var(--color-bone)]">
        D
      </div>
      <div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-1.5">
          Dad says
        </div>
        <div className="font-[family-name:var(--font-fraunces)] italic text-[1.1rem] leading-snug text-[var(--color-warm-bone)]">
          {body}
        </div>
      </div>
    </div>
  );
}
