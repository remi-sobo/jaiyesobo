type Props = {
  greetingName: string;
  streak: number;
  bestStreak?: number;
};

export default function TodayHeader({ greetingName, streak, bestStreak }: Props) {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  const dayNum = now.getDate();
  const weekNum = getIsoWeekNumber(now);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const showBest = typeof bestStreak === "number" && streak > 7 && bestStreak >= streak;

  return (
    <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 mb-16 pb-10 border-b border-[var(--color-line)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />
          <span>Today</span>
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
          {greeting}, <span className="italic font-normal text-[var(--color-red)]">{greetingName}.</span>
        </h1>
        <div className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-2">
          {dayName} · {month} {dayNum} · Week {weekNum}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            Day streak
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-black text-3xl leading-none tracking-tight mt-1">
            <span className="italic font-normal text-[var(--color-red)] mr-1">★</span>
            {streak}
          </div>
          {showBest && (
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mt-1">
              Best: {bestStreak}
            </div>
          )}
        </div>
        <div className="w-14 h-14 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface-2)] flex items-center justify-center font-[family-name:var(--font-fraunces)] italic font-black text-2xl text-[var(--color-red)]">
          J
        </div>
      </div>
    </header>
  );
}

function getIsoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}
