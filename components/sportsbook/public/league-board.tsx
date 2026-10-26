import type { ApiBoard, ApiRival } from "@/lib/app-api/types";

const mono = "font-[family-name:var(--font-jetbrains)]";

/** A ranked board from the app API shapes. Jaiye and Remi show as "would be #n" on leagues they aren't in. */
export function BoardTable({ board, pointsLabel = "Pts" }: { board: ApiBoard; pointsLabel?: string }) {
  if (board.rows.length === 0) return <p className="text-[0.95rem] text-[var(--color-mute)]">Nobody&apos;s on the board yet.</p>;
  return (
    <div>
      <p className="mb-3 font-[family-name:var(--font-fraunces)] text-[1.15rem] leading-snug">{board.headline}</p>
      <ol className="flex flex-col">
        {board.rows.map((r) => (
          <li
            key={r.player_id}
            className={`flex min-h-12 items-center gap-3 border-b border-[var(--color-line)] px-2 ${r.is_me ? "bg-[var(--color-off-black)]" : ""} ${r.ghost ? "border-dashed opacity-75" : ""}`}
          >
            <span className={`${mono} w-6 text-[0.8rem] text-[var(--color-mute)]`}>{r.ghost ? "" : r.rank}</span>
            <span className={`min-w-0 flex-1 truncate ${r.kind !== "challenger" ? "text-[var(--color-red)]" : ""}`}>
              {r.display_name}
              {r.is_me ? <span className="text-[var(--color-mute)]"> (you)</span> : null}
              {r.ghost ? <span className={`${mono} ml-2 text-[0.65rem] uppercase tracking-[0.1em] text-[var(--color-mute)]`}>would be #{r.rank} here</span> : null}
              {r.beat_jaiye && r.beat_remi ? (
                <span className={`${mono} ml-2 border border-[var(--color-red)] px-1 text-[0.6rem] uppercase text-[var(--color-red)]`}>Beat J&amp;R</span>
              ) : null}
            </span>
            {board.span === "season" ? <span className={`${mono} text-[0.7rem] text-[var(--color-mute)]`}>{r.weeks_won}W</span> : null}
            <span className="w-10 text-right font-[family-name:var(--font-fraunces)] text-[1.25rem] font-black" aria-label={`${r.points} ${pointsLabel}`}>
              {r.points}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RivalList({ rivals }: { rivals: ApiRival[] }) {
  const played = rivals.filter((r) => r.wins + r.losses + r.ties > 0);
  if (played.length === 0) return <p className="text-[0.95rem] text-[var(--color-mute)]">Rivalries start once a week is final. Play this week and check back Monday.</p>;
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {played.map((r) => (
        <li key={r.player_id} className="flex min-h-14 items-center gap-3 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] px-3">
          <span className={`min-w-0 flex-1 truncate ${r.kind !== "challenger" ? "text-[var(--color-red)]" : ""}`}>{r.display_name}</span>
          <span className={`${mono} text-[0.85rem]`}>
            You {r.wins} · {r.kind === "challenger" ? "them" : r.display_name} {r.losses}
            {r.ties ? ` · ${r.ties} tied` : ""}
          </span>
          {r.streak >= 2 ? <span className={`${mono} text-[0.7rem] text-[var(--color-green)]`}>Won {r.streak} straight</span> : null}
          {r.streak <= -2 ? <span className={`${mono} text-[0.7rem] text-[var(--color-red-soft)]`}>Lost {-r.streak} straight</span> : null}
        </li>
      ))}
    </ul>
  );
}
