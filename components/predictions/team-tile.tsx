import { TEAMS, tileText, type TeamCode } from "@/lib/nba/teams";

/**
 * A team, drawn as a colored tile: team color background, three letter code
 * in Fraunces, city and name in small Inter. No logos on purpose.
 */
export function TeamTile({
  code,
  size = "md",
  className = "",
}: {
  code: TeamCode;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const t = TEAMS[code];
  const fg = tileText(t.primary);
  const dims =
    size === "xl"
      ? { box: "w-[220px] h-[220px] p-5", code: "text-[5.5rem]", meta: "text-[0.85rem]", bar: "h-2.5" }
      : size === "lg"
        ? { box: "w-[132px] h-[132px] p-3.5", code: "text-[3.2rem]", meta: "text-[0.7rem]", bar: "h-1.5" }
        : { box: "w-[84px] h-[84px] p-2.5", code: "text-[1.9rem]", meta: "text-[0.55rem]", bar: "h-1" };
  return (
    <div
      className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[4px] ring-1 ring-inset ring-[rgba(245,241,234,0.12)] ${dims.box} ${className}`}
      style={{ background: t.primary, color: fg }}
    >
      <span className={`font-[family-name:var(--font-fraunces)] font-black leading-[0.85] tracking-[-0.04em] ${dims.code}`}>
        {t.code}
      </span>
      <span className={`font-[family-name:var(--font-inter)] font-medium leading-tight ${dims.meta}`} style={{ opacity: 0.85 }}>
        {t.city}
        <br />
        {t.name}
      </span>
      <span className={`absolute inset-x-0 bottom-0 ${dims.bar}`} style={{ background: t.secondary }} />
    </div>
  );
}

/** The small square used inside rows: code only, team color background. */
export function TeamChip({ code, className = "" }: { code: TeamCode; className?: string }) {
  const t = TEAMS[code];
  return (
    <span
      className={`relative inline-flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[3px] font-[family-name:var(--font-fraunces)] text-[0.95rem] font-black tracking-[-0.02em] ring-1 ring-inset ring-[rgba(245,241,234,0.12)] ${className}`}
      style={{ background: t.primary, color: tileText(t.primary) }}
    >
      {t.code}
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: t.secondary }} />
    </span>
  );
}

/** Chip plus city and name, for list rows. */
export function TeamRowLabel({ code, compact = false }: { code: TeamCode; compact?: boolean }) {
  const t = TEAMS[code];
  return (
    <span className="flex min-w-0 items-center gap-3">
      <TeamChip code={code} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[0.92rem] font-medium text-[var(--color-bone)]">
          {compact ? t.name : `${t.city} ${t.name}`}
        </span>
      </span>
    </span>
  );
}
