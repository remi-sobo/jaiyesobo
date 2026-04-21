"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackEntry } from "@/lib/admin-data";

type Props = { items: FeedbackEntry[] };

type Filter = "all" | "bug" | "idea" | "unsure" | "closed";

const STATUSES: FeedbackEntry["status"][] = ["new", "in_progress", "fixed", "closed"];

const STATUS_LABELS: Record<FeedbackEntry["status"], string> = {
  new: "New",
  in_progress: "In progress",
  fixed: "Fixed",
  closed: "Closed",
};

export default function FeedbackList({ items }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const visible = useMemo(() => {
    let out = items.filter((i) => !i.archived_at);
    if (filter === "closed") return items.filter((i) => i.status === "closed" || i.archived_at);
    if (filter === "bug") out = out.filter((i) => i.kind === "bug");
    else if (filter === "idea") out = out.filter((i) => i.kind === "idea");
    else if (filter === "unsure") out = out.filter((i) => i.kind === "unsure" || i.kind === null);
    return out.filter((i) => i.status !== "closed");
  }, [items, filter]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const counts = {
    all: items.filter((i) => !i.archived_at && i.status !== "closed").length,
    bug: items.filter((i) => i.kind === "bug" && !i.archived_at && i.status !== "closed").length,
    idea: items.filter((i) => i.kind === "idea" && !i.archived_at && i.status !== "closed").length,
    unsure: items.filter((i) => (i.kind === "unsure" || i.kind === null) && !i.archived_at && i.status !== "closed").length,
    closed: items.filter((i) => i.status === "closed" || i.archived_at).length,
  };

  return (
    <>
      <div className="flex gap-2 mb-8 border-b border-[var(--color-line)] pb-2 flex-wrap">
        {(["all", "bug", "idea", "unsure", "closed"] as Filter[]).map((f) => {
          const label = f === "all" ? "All" : f === "bug" ? "Bugs" : f === "idea" ? "Ideas" : f === "unsure" ? "Not sure" : "Closed";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-3 py-2 rounded-sm border-b-2 transition-colors ${
                filter === f
                  ? "text-[var(--color-bone)] border-[var(--color-red)]"
                  : "text-[var(--color-warm-mute)] border-transparent hover:text-[var(--color-bone)]"
              }`}
            >
              {label} <span className="text-[var(--color-warm-dim)] ml-1">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
          Nothing in this bucket.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {visible.map((item) => {
            const ts = new Date(item.submitted_at);
            const age = relativeTime(ts);
            const kindTag = kindBadge(item.kind);
            return (
              <article
                key={item.id}
                className={`bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 ${
                  item.status === "new" && !item.dad_reply ? "border-l-[3px] border-l-[var(--color-red)]" : ""
                }`}
              >
                <header className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
                      <time title={ts.toLocaleString()}>{age}</time>
                      {kindTag && (
                        <span
                          className="px-1.5 py-0.5 rounded-sm"
                          style={{ background: kindTag.bg, color: kindTag.fg }}
                        >
                          {kindTag.label}
                        </span>
                      )}
                    </div>
                    {item.page_url && (
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-[var(--color-warm-dim)] truncate max-w-[60ch]">
                        {prettyUrl(item.page_url)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) => patch(item.id, { status: e.target.value })}
                      disabled={busy === item.id}
                      className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded px-2 py-1.5 text-[0.7rem] text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => patch(item.id, { archived: true })}
                      disabled={busy === item.id}
                      title="Archive"
                      className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-2 py-1.5 text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                </header>

                <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] text-[1.05rem] leading-relaxed mb-4 whitespace-pre-wrap">
                  &ldquo;{item.body}&rdquo;
                </p>

                {item.dad_reply ? (
                  <div className="bg-[var(--color-warm-surface-2)] border-l-2 border-[var(--color-red)] rounded-r px-4 py-3 text-sm text-[var(--color-bone)] leading-relaxed">
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-red)] mb-1">
                      You replied {item.dad_replied_at ? relativeTime(new Date(item.dad_replied_at)) : ""}
                      {item.seen_by_kid_at ? " · seen" : " · unseen"}
                    </div>
                    {item.dad_reply}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={replies[item.id] ?? ""}
                      onChange={(e) => setReplies({ ...replies, [item.id]: e.target.value })}
                      placeholder="Reply to Jaiye — appears on his Today as a Dad says card."
                      rows={2}
                      className="w-full bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-2.5 text-sm text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)] resize-y"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const text = replies[item.id]?.trim();
                          if (!text) return;
                          patch(item.id, { reply: text });
                          setReplies((r) => ({ ...r, [item.id]: "" }));
                        }}
                        disabled={busy === item.id || !(replies[item.id]?.trim())}
                        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] px-4 py-2 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 transition-colors"
                      >
                        Send reply
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function relativeTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60000))}m ago`;
  if (hours < 24) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return raw;
  }
}

function kindBadge(kind: FeedbackEntry["kind"]): { label: string; bg: string; fg: string } | null {
  if (kind === "bug") return { label: "Bug", bg: "rgba(230,57,70,0.18)", fg: "#ff6b73" };
  if (kind === "idea") return { label: "Idea", bg: "rgba(244,162,97,0.18)", fg: "#f4a261" };
  if (kind === "unsure") return { label: "Not sure", bg: "rgba(138,133,120,0.18)", fg: "#8a8578" };
  return null;
}
