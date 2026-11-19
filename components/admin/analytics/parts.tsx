import type { ReactNode } from "react";

/** Small building blocks for /admin/analytics. Server components, no state. */

const mono = "font-[family-name:var(--font-jetbrains)]";

export function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 border border-[var(--color-line)] bg-[var(--color-warm-surface)] p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={`${mono} text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-bone)]`}>{title}</h2>
        {note ? <span className="text-[0.75rem] text-[var(--color-warm-mute)]">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-[0.9rem] text-[var(--color-warm-mute)]">{children}</p>;
}

/** A headline number with its change against the period before. */
export function Stat({ label, value, now, before, versus }: { label: string; value: string; now: number; before: number; versus: string }) {
  let delta: ReactNode = <span className="text-[var(--color-warm-mute)]">no earlier data</span>;
  if (before > 0) {
    const pct = Math.round(((now - before) / before) * 100);
    const tone = pct > 0 ? "text-[var(--color-green)]" : pct < 0 ? "text-[var(--color-amber)]" : "text-[var(--color-warm-mute)]";
    delta = (
      <>
        <span className={tone}>
          {pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {pct > 0 ? "+" : ""}
          {pct}%
        </span>{" "}
        <span className="text-[var(--color-warm-mute)]">vs {versus}</span>
      </>
    );
  } else if (now > 0) {
    delta = <span className="text-[var(--color-warm-mute)]">new this period</span>;
  }
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-warm-surface)] p-4">
      <div className={`${mono} text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>{label}</div>
      <div className="mt-2 font-[family-name:var(--font-fraunces)] text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-2 text-[0.75rem]">{delta}</div>
    </div>
  );
}

export type Column = { label: string; align?: "right" };

/**
 * A ranked list: name on the left, a thin bar for the first number, then the
 * numbers. One color for every bar, since the rows are not different kinds
 * of thing.
 */
export function RankTable({
  head,
  columns,
  rows,
  limit = 10,
}: {
  head: string;
  columns: Column[];
  rows: { key: string; name: ReactNode; sub?: ReactNode; bar: number; cells: ReactNode[] }[];
  limit?: number;
}) {
  const max = Math.max(...rows.map((r) => r.bar), 1);
  const body = (list: typeof rows) =>
    list.map((r) => (
      <tr key={r.key} className="border-t border-[var(--color-line)] align-top">
        <td className="py-2 pr-3">
          <div className="break-words text-[0.9rem] leading-snug text-[var(--color-bone)]">{r.name}</div>
          {r.sub ? <div className="mt-0.5 break-all text-[0.72rem] text-[var(--color-warm-mute)]">{r.sub}</div> : null}
          <div aria-hidden className="mt-1.5 h-1 w-full bg-[var(--color-warm-surface-3)]">
            <div className="h-full rounded-r-[2px] bg-[var(--color-red)]" style={{ width: `${Math.max(1.5, (r.bar / max) * 100)}%` }} />
          </div>
        </td>
        {r.cells.map((c, i) => (
          <td key={i} className="w-[1%] whitespace-nowrap py-2 pl-3 text-right text-[0.9rem] tabular-nums text-[var(--color-warm-bone)]">
            {c}
          </td>
        ))}
      </tr>
    ));
  const table = (list: typeof rows, withHead: boolean) => (
    <table className="w-full">
      <thead className={withHead ? "" : "sr-only"}>
        <tr className={`${mono} text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-warm-mute)]`}>
          <th className="pb-2 pr-3 text-left font-normal">{head}</th>
          {columns.map((c) => (
            <th key={c.label} className="pb-2 pl-3 text-right font-normal">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{body(list)}</tbody>
    </table>
  );
  return (
    <div>
      {table(rows.slice(0, limit), true)}
      {rows.length > limit ? (
        <details>
          <summary className={`${mono} mt-3 cursor-pointer text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]`}>
            Show {rows.length - limit} more
          </summary>
          {table(rows.slice(limit), false)}
        </details>
      ) : null}
    </div>
  );
}
