"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CutSetRow } from "@/lib/games/the-cut-data";
import {
  CUT_SET_DIFFICULTIES,
  REQUIRED_KEEPS,
  TOTAL_ITEMS,
  type CutSetDifficulty,
  type CutSetItem,
} from "@/lib/games/the-cut";

type Props = { set: CutSetRow };

type ItemRow = CutSetItem;

export default function VerifyCutSetEditor({ set }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(set.payload.title);
  const [easyPrompt, setEasyPrompt] = useState(set.payload.easy_prompt);
  const [hardPrompt, setHardPrompt] = useState(set.payload.hard_prompt);
  const [criterion, setCriterion] = useState(set.payload.criterion_summary);
  const [category, setCategory] = useState(set.payload.category);
  const [difficulty, setDifficulty] = useState<CutSetDifficulty>(set.payload.difficulty);
  const [items, setItems] = useState<ItemRow[]>(set.payload.items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = set.status === "live" && set.verification_status === "verified";
  const isRejected = set.verification_status === "rejected";

  const keepCount = useMemo(() => items.filter((i) => i.is_keep).length, [items]);
  const cutCount = items.length - keepCount;
  const isValid =
    items.length === TOTAL_ITEMS &&
    keepCount === REQUIRED_KEEPS &&
    title.trim().length > 0 &&
    easyPrompt.trim().length > 0 &&
    criterion.trim().length > 0 &&
    items.every((i) => i.name.trim().length > 0 && i.fact.trim().length > 0);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function toggleKeep(idx: number) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, is_keep: !it.is_keep } : it)));
  }

  async function save(opts: { publish?: boolean; reject?: boolean }) {
    setError(null);
    if (opts.publish && !isValid) {
      setError(
        `Need exactly ${TOTAL_ITEMS} items, exactly ${REQUIRED_KEEPS} keeps, plus a title/criterion/easy prompt.`
      );
      return;
    }
    setBusy(true);
    const payload = {
      title: title.trim(),
      easy_prompt: easyPrompt.trim(),
      hard_prompt: hardPrompt.trim() || "Four of these belong together. Find them.",
      category: category.trim() || "general",
      difficulty,
      criterion_summary: criterion.trim(),
      items: items.map((i) => ({
        name: i.name.trim(),
        is_keep: i.is_keep,
        fact: i.fact.trim(),
      })),
    };
    const body: Record<string, unknown> = { payload };
    if (opts.publish) {
      body.status = "live";
      body.verification_status = "verified";
    }
    if (opts.reject) {
      body.verification_status = "rejected";
      body.status = "draft";
    }
    const res = await fetch(`/api/games-admin/cut-sets/${set.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
    if (!res.ok) {
      setError(data.detail ?? data.error ?? "Save failed");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (opts.publish || opts.reject) {
      router.push("/games-admin/cut-sets");
    } else {
      router.refresh();
    }
  }

  async function destroy() {
    if (!confirm("Delete this cut set? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/games-admin/cut-sets/${set.id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      setError("Delete failed");
      return;
    }
    router.push("/games-admin/cut-sets");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
            Cut set ·{" "}
            {isLive ? (
              <span className="text-[var(--color-green)]">Live</span>
            ) : isRejected ? (
              <span className="text-[var(--color-red-soft)]">Rejected</span>
            ) : (
              <span className="text-[var(--color-amber)]">Draft</span>
            )}
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight">
            {title || "(untitled)"}
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <KeepBadge keepCount={keepCount} cutCount={cutCount} />
        </div>
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <Span>Title</Span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Span>Category</Span>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <Span>Criterion summary</Span>
          <input
            type="text"
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
            placeholder="Won Sixth Man of the Year"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <Span>Easy-mode prompt (shown to player)</Span>
          <input
            type="text"
            value={easyPrompt}
            onChange={(e) => setEasyPrompt(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <Span>Hard-mode prompt</Span>
          <input
            type="text"
            value={hardPrompt}
            onChange={(e) => setHardPrompt(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Span>Set difficulty</Span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CutSetDifficulty)}
            className={inputCls}
          >
            {CUT_SET_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-lg">
            Items ({items.length})
          </h2>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Toggle Keep / Cut · exactly 4 each
          </span>
        </div>
        <ul className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li
              key={i}
              className={`grid grid-cols-[110px_1fr_2fr] gap-3 items-start p-3 rounded border ${
                it.is_keep
                  ? "border-[var(--color-green)]/40 bg-[var(--color-green)]/5"
                  : "border-[var(--color-red-soft)]/40 bg-[var(--color-red-soft)]/5"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleKeep(i)}
                className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] rounded-sm px-2.5 py-1.5 border transition-colors ${
                  it.is_keep
                    ? "border-[var(--color-green)] text-[var(--color-green)] hover:bg-[var(--color-green)]/10"
                    : "border-[var(--color-red-soft)] text-[var(--color-red-soft)] hover:bg-[var(--color-red-soft)]/10"
                }`}
              >
                {it.is_keep ? "KEEP" : "CUT"}
              </button>
              <input
                type="text"
                value={it.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder="Player name"
                className={inputCls}
              />
              <input
                type="text"
                value={it.fact}
                onChange={(e) => updateItem(i, { fact: e.target.value })}
                placeholder="Fact / connection"
                className={inputCls}
              />
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="text-[var(--color-red-soft)] text-sm border border-[var(--color-red-soft)]/40 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => save({ publish: true })}
          disabled={busy || !isValid}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : isLive ? "Save & keep live" : "Verify & publish"}
        </button>
        <button
          type="button"
          onClick={() => save({})}
          disabled={busy}
          className="border border-[var(--color-line)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:border-[var(--color-bone)] transition-colors disabled:opacity-50"
        >
          Save draft
        </button>
        {!isRejected && (
          <button
            type="button"
            onClick={() => save({ reject: true })}
            disabled={busy}
            className="border border-[var(--color-line)] text-[var(--color-warm-mute)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:text-[var(--color-red-soft)] hover:border-[var(--color-red-soft)] transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
        <button
          type="button"
          onClick={destroy}
          disabled={busy}
          className="ml-auto font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red-soft)] disabled:opacity-50"
        >
          Delete set
        </button>
      </div>
    </div>
  );
}

function KeepBadge({ keepCount, cutCount }: { keepCount: number; cutCount: number }) {
  const ok = keepCount === REQUIRED_KEEPS && cutCount === REQUIRED_KEEPS;
  return (
    <div
      className={`flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm border ${
        ok
          ? "border-[var(--color-green)] text-[var(--color-green)]"
          : "border-[var(--color-amber)] text-[var(--color-amber)]"
      }`}
    >
      <span>{keepCount} keeps · {cutCount} cuts</span>
      {ok ? <span>✓</span> : <span>!</span>}
    </div>
  );
}

const inputCls =
  "bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]";

function Span({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
      {children}
    </span>
  );
}
