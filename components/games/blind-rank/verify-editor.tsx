"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BlindRankTopicRow } from "@/lib/games/blind-rank-data";
import {
  BLIND_RANK_DIFFICULTIES,
  BLIND_RANK_KINDS,
  POOL_MAX,
  POOL_MIN,
  type BlindRankDifficulty,
  type BlindRankItem,
  type BlindRankKind,
} from "@/lib/games/blind-rank";

type Props = { topic: BlindRankTopicRow };

type Row = { id: string; name: string; fact: string };

export default function VerifyBlindRankEditor({ topic }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(topic.payload.title);
  const [subtitle, setSubtitle] = useState(topic.payload.subtitle);
  const [category, setCategory] = useState(topic.payload.category);
  const [difficulty, setDifficulty] = useState<BlindRankDifficulty>(
    topic.payload.difficulty
  );
  const [kind, setKind] = useState<BlindRankKind>(topic.payload.kind ?? "factual");
  // Sort by rank for the initial editor view so drag-reorder maps cleanly.
  const initialRows: Row[] = useMemo(
    () =>
      topic.payload.items
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((it, i) => ({ id: `r-${i}`, name: it.name, fact: it.fact })),
    [topic.payload.items]
  );
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = topic.status === "live" && topic.verification_status === "verified";
  const isRejected = topic.verification_status === "rejected";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sizeOk = rows.length >= POOL_MIN && rows.length <= POOL_MAX;
  const namesOk = rows.every((r) => r.name.trim().length > 0);
  const factsOk = rows.every((r) => r.fact.trim().length > 0);
  const seen = new Set(rows.map((r) => r.name.trim().toLowerCase()));
  const uniqueOk = seen.size === rows.length && !seen.has("");
  const isValid =
    title.trim().length > 0 && sizeOk && namesOk && factsOk && uniqueOk;

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === e.active.id);
    const newIndex = rows.findIndex((r) => r.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setRows((cur) => arrayMove(cur, oldIndex, newIndex));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((cur) => cur.filter((r) => r.id !== id));
  }

  function addRow() {
    if (rows.length >= POOL_MAX) return;
    setRows((cur) => [...cur, { id: `r-${cur.length}-${Date.now()}`, name: "", fact: "" }]);
  }

  async function save(opts: { publish?: boolean; reject?: boolean }) {
    setError(null);
    if (opts.publish && !isValid) {
      setError(
        `Need ${POOL_MIN}–${POOL_MAX} items with unique non-empty names and facts.`
      );
      return;
    }
    setBusy(true);
    // Rank is the row's position (1-indexed) after drag-reorder.
    const items: BlindRankItem[] = rows.map((r, i) => ({
      name: r.name.trim(),
      rank: i + 1,
      fact: r.fact.trim(),
    }));
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      category: category.trim() || "general",
      difficulty,
      kind,
      pool_size: items.length,
      items,
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
    const res = await fetch(`/api/games-admin/blind-rank/${topic.id}`, {
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
      router.push("/games-admin/blind-rank");
    } else {
      router.refresh();
    }
  }

  async function destroy() {
    if (!confirm("Delete this topic? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/games-admin/blind-rank/${topic.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setBusy(false);
      setError("Delete failed");
      return;
    }
    router.push("/games-admin/blind-rank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
            Blind Rank topic ·{" "}
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
        <div
          className={`flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm border ${
            sizeOk && uniqueOk
              ? "border-[var(--color-green)] text-[var(--color-green)]"
              : "border-[var(--color-amber)] text-[var(--color-amber)]"
          }`}
        >
          {rows.length} item{rows.length === 1 ? "" : "s"} ·{" "}
          {sizeOk && uniqueOk ? "✓" : "!"}
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
          <Span>Subtitle (one-line criteria)</Span>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <Span>Difficulty</Span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as BlindRankDifficulty)}
            className={inputCls}
          >
            {BLIND_RANK_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <Span>Kind</Span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BlindRankKind)}
            className={inputCls}
          >
            {BLIND_RANK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k} {k === "factual" ? "(strict scoring)" : "(AI judges the take)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-lg">
            Ranking ({rows.length})
          </h2>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Drag rows to reorder · rank is row position
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  rank={i + 1}
                  onChange={(patch) => updateRow(row.id, patch)}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {rows.length < POOL_MAX && (
          <button
            type="button"
            onClick={addRow}
            className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
          >
            + Add item
          </button>
        )}
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
          Delete topic
        </button>
      </div>
    </div>
  );
}

function SortableRow({
  row,
  rank,
  onChange,
  onRemove,
}: {
  row: Row;
  rank: number;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[40px_28px_1fr_2fr_24px] gap-3 items-start p-2 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface-2)]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] flex items-center justify-center text-lg"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div className="font-[family-name:var(--font-fraunces)] font-black text-[var(--color-red)] text-xl text-right pr-1">
        {rank}
      </div>
      <input
        type="text"
        value={row.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Name"
        className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
      />
      <input
        type="text"
        value={row.fact}
        onChange={(e) => onChange({ fact: e.target.value })}
        placeholder="Fact / justification"
        className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-[var(--color-warm-mute)] hover:text-[var(--color-red-soft)]"
        aria-label="Remove"
      >
        ×
      </button>
    </li>
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
