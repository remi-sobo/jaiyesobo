type Props = {
  done: number;
  total: number;
};

export default function SummaryCard({ done, total }: Props) {
  const left = Math.max(0, total - done);
  const progress = total === 0 ? 1 : done / total;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - progress);

  const message =
    done === 0
      ? "Let's get to it."
      : left === 0
      ? "You did it. Full day."
      : `You've already knocked out ${done}. Keep going.`;

  return (
    <div className="relative grid grid-cols-[1fr_auto] gap-8 items-center p-8 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden mb-10">
      <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-transparent to-[rgba(230,57,70,0.05)] pointer-events-none" />
      <div className="relative">
        <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl leading-snug tracking-[-0.01em] mb-2">
          <span className="italic font-black text-[var(--color-red)]">{left || "0"}</span>
          {" "}
          {left === 1 ? "thing" : "things"} left to finish today.
        </h2>
        <p className="text-[var(--color-warm-mute)] text-[0.95rem] leading-relaxed max-w-[42ch]">
          {message}
        </p>
      </div>

      <div className="relative w-[100px] h-[100px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-line-strong)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--color-red)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-[family-name:var(--font-fraunces)]">
          <div className="font-black text-[1.75rem] leading-none tracking-tight">
            {done}/{total}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-1">
            Done
          </div>
        </div>
      </div>
    </div>
  );
}
