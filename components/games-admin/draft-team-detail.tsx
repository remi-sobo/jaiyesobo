"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftPlayerRow, DraftPosition } from "@/lib/draft-data";

type Props = { teamSlug: string; initial: DraftPlayerRow[] };

type Filter = "all" | "pending" | "verified" | "rejected";

const POSITIONS: DraftPosition[] = ["G", "F", "C"];

export default function DraftTeamDetail({ teamSlug, initial }: Props) {
  const router = useRouter();
  const [players, setPlayers] = useState(initial);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visible = useMemo(() => {
    if (filter === "all") return players;
    return players.filter((p) => p.verification_status === filter);
  }, [players, filter]);

  const counts = useMemo(
    () => ({
      all: players.length,
      pending: players.filter((p) => p.verification_status === "pending").length,
      verified: players.filter((p) => p.verification_status === "verified").length,
      rejected: players.filter((p) => p.verification_status === "rejected").length,
    }),
    [players]
  );

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/games-admin/draft-players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // optimistic local update
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  verification_status:
                    typeof body.verification_status === "string"
                      ? (body.verification_status as DraftPlayerRow["verification_status"])
                      : p.verification_status,
                  payload:
                    body.payload && typeof body.payload === "object"
                      ? (body.payload as DraftPlayerRow["payload"])
                      : p.payload,
                }
              : p
          )
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function verifyAllPending() {
    const pendingIds = players
      .filter((p) => p.verification_status === "pending")
      .map((p) => p.id);
    if (pendingIds.length === 0) return;
    if (!confirm(`Verify all ${pendingIds.length} pending players for this team?`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/games-admin/draft-players/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingIds, verification_status: "verified" }),
      });
      if (res.ok) {
        setPlayers((prev) =>
          prev.map((p) =>
            pendingIds.includes(p.id) ? { ...p, verification_status: "verified" as const } : p
          )
        );
      }
    } finally {
      setBulkBusy(false);
      router.refresh();
    }
  }

  if (players.length === 0) {
    return (
      <div className="p-12 border border-dashed border-[var(--color-line-strong)] rounded text-center text-[var(--color-warm-mute)]">
        <p className="font-[family-name:var(--font-fraunces)] italic text-lg mb-3">
          No players yet for this team.
        </p>
        <p className="text-sm leading-relaxed mb-5">
          Generate a pool with{" "}
          <code className="font-[family-name:var(--font-jetbrains)] text-[var(--color-bone)]">
            npx tsx scripts/generate-team-players.ts {teamSlug}
          </code>{" "}
          and then import the JSON.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <FilterTab label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterTab
          label="Pending"
          count={counts.pending}
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
          accent="amber"
        />
        <FilterTab
          label="Verified"
          count={counts.verified}
          active={filter === "verified"}
          onClick={() => setFilter("verified")}
          accent="green"
        />
        <FilterTab
          label="Rejected"
          count={counts.rejected}
          active={filter === "rejected"}
          onClick={() => setFilter("rejected")}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={verifyAllPending}
          disabled={bulkBusy || counts.pending === 0}
          className="bg-[var(--color-green)] text-[var(--color-warm-bg)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2.5 rounded-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          {bulkBusy ? "…" : `Verify all pending (${counts.pending})`}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((p) => (
          <PlayerRow key={p.id} player={p} onPatch={patch} busy={busy === p.id} />
        ))}
        {visible.length === 0 && (
          <p className="text-center text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)] py-12">
            No players in this bucket.
          </p>
        )}
      </div>
    </>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  accent?: "amber" | "green";
}) {
  const accentClass = !active
    ? "text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] border-transparent"
    : accent === "amber"
    ? "text-[var(--color-amber)] border-[var(--color-amber)]"
    : accent === "green"
    ? "text-[var(--color-green)] border-[var(--color-green)]"
    : "text-[var(--color-bone)] border-[var(--color-red)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-3 py-2 rounded-sm border-b-2 transition-colors ${accentClass}`}
    >
      {label} <span className="text-[var(--color-warm-dim)] ml-1">{count}</span>
    </button>
  );
}

function PlayerRow({
  player,
  onPatch,
  busy,
}: {
  player: DraftPlayerRow;
  onPatch: (id: string, body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.payload);
  const [aliasesText, setAliasesText] = useState(player.payload.search_aliases.join(", "));
  const [secondaryText, setSecondaryText] = useState(player.payload.secondary_positions.join(", "));
  const [error, setError] = useState<string | null>(null);

  const status = player.verification_status;
  const stripeColor =
    status === "verified"
      ? "var(--color-green)"
      : status === "rejected"
      ? "var(--color-red-soft)"
      : "var(--color-amber)";

  function reset() {
    setDraft(player.payload);
    setAliasesText(player.payload.search_aliases.join(", "));
    setSecondaryText(player.payload.secondary_positions.join(", "));
    setEditing(false);
    setError(null);
  }

  async function save() {
    const aliases = aliasesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const secondary = secondaryText
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    for (const p of secondary) {
      if (p !== "G" && p !== "F" && p !== "C") {
        setError(`Invalid secondary position "${p}". Must be G, F, or C.`);
        return;
      }
    }
    if (!["G", "F", "C"].includes(draft.primary_position)) {
      setError("Primary position must be G, F, or C.");
      return;
    }
    setError(null);

    const payload = {
      ...draft,
      search_aliases: aliases,
      secondary_positions: secondary as ("G" | "F" | "C")[],
    };
    await onPatch(player.id, { payload });
    setEditing(false);
  }

  return (
    <article
      className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4"
      style={{ borderLeft: `3px solid ${stripeColor}` }}
    >
      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem]">
                {player.payload.name}
              </h3>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
                {player.payload.primary_position}
                {player.payload.secondary_positions.length > 0 &&
                  ` / ${player.payload.secondary_positions.join("/")}`}
              </span>
              {player.payload.team_stint.is_iconic && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-red)] bg-[rgba(230,57,70,0.1)] px-2 py-0.5 rounded-sm">
                  ★ Iconic
                </span>
              )}
            </div>
            <div className="text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] mb-1">
              {player.payload.team_stint.peak_label}
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
              {player.payload.team_stint.years} · aliases:{" "}
              {player.payload.search_aliases.join(", ") || "—"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end items-center">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] px-3 py-2 transition-colors"
            >
              Edit
            </button>
            {status !== "verified" && (
              <button
                type="button"
                onClick={() => onPatch(player.id, { verification_status: "verified" })}
                disabled={busy}
                className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-3 py-2 rounded-sm border border-[var(--color-green)] text-[var(--color-green)] hover:bg-[var(--color-green)] hover:text-[var(--color-warm-bg)] transition-colors disabled:opacity-50"
              >
                Verify
              </button>
            )}
            {status !== "rejected" && (
              <button
                type="button"
                onClick={() => onPatch(player.id, { verification_status: "rejected" })}
                disabled={busy}
                className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-3 py-2 rounded-sm border border-[var(--color-red-soft)] text-[var(--color-red-soft)] hover:bg-[var(--color-red-soft)] hover:text-[var(--color-warm-bg)] transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {status !== "pending" && (
              <button
                type="button"
                onClick={() => onPatch(player.id, { verification_status: "pending" })}
                disabled={busy}
                className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-3 py-2 text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Name"
              className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
            <select
              value={draft.primary_position}
              onChange={(e) =>
                setDraft({ ...draft, primary_position: e.target.value as DraftPosition })
              }
              className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={secondaryText}
              onChange={(e) => setSecondaryText(e.target.value)}
              placeholder="Secondary (e.g. F, C)"
              className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
          </div>
          <input
            value={draft.team_stint.peak_label}
            onChange={(e) =>
              setDraft({ ...draft, team_stint: { ...draft.team_stint, peak_label: e.target.value } })
            }
            placeholder="Peak label"
            className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <input
              value={draft.team_stint.years}
              onChange={(e) =>
                setDraft({ ...draft, team_stint: { ...draft.team_stint, years: e.target.value } })
              }
              placeholder="Years (e.g. 1996–2016)"
              className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
            />
            <label className="flex items-center gap-2 px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded">
              <input
                type="checkbox"
                checked={draft.team_stint.is_iconic}
                onChange={(e) =>
                  setDraft({ ...draft, team_stint: { ...draft.team_stint, is_iconic: e.target.checked } })
                }
              />
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
                Iconic
              </span>
            </label>
          </div>
          <input
            value={aliasesText}
            onChange={(e) => setAliasesText(e.target.value)}
            placeholder="Aliases (comma-separated)"
            className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
          {error && <p className="text-sm italic font-[family-name:var(--font-fraunces)] text-[var(--color-red-soft)]">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={reset}
              className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-5 py-2 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-50 transition-colors"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
