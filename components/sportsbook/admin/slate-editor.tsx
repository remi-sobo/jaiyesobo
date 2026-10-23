"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_INFO, categoryOf, type SbItem } from "@/lib/sportsbook/types";
import { CardHead, CardPrompt, TeamDot } from "../card-parts";
import { TILE_TONE } from "../tiles";
import { useSbAction } from "./use-action";

const btn =
  "min-h-10 border px-3 font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.15em] disabled:opacity-40";

/**
 * Sunday: the AI drafts six tiles of about 5 picks. Swap a pick, redo a whole
 * tile, add Jaiye's Prop, then open the week.
 */
export default function SlateEditor({ week, items, status, now }: { week: number; items: SbItem[]; status: "none" | "draft"; now: number }) {
  const { run, busy, error } = useSbAction();
  const [note, setNote] = useState<string | null>(null);
  const groups = CATEGORIES.map((c) => ({ category: c, items: items.filter((i) => categoryOf(i) === c) }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!!busy}
          onClick={async () => {
            if (items.length && !window.confirm("Redraft every tile? All the AI picks get replaced. Jaiye's Props stay.")) return;
            setNote(null);
            const res = await run("draft", { week });
            const failed = Array.isArray(res?.failed) ? (res.failed as string[]) : [];
            if (failed.length) setNote(`These tiles didn't come back: ${failed.join(", ")}. Tap "Redo this tile" on each one.`);
          }}
          className={`${btn} border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-black)]`}
        >
          {busy === "draft" ? "The AI is building all 6 tiles…" : items.length ? "Redraft every tile" : "Draft this week with AI"}
        </button>
        {items.length > 0 ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("open", { week })}
            className={`${btn} border-[var(--color-green)] text-[var(--color-green)]`}
          >
            Open the week ({items.length} picks)
          </button>
        ) : null}
        <span className="text-[0.85rem] text-[var(--color-warm-mute)]">
          {status === "none" ? "Nothing drafted yet." : "Draft. Nobody can see this until you open the week."}
        </span>
      </div>
      {busy === "draft" ? (
        <p className="mb-6 text-[0.9rem] text-[var(--color-warm-mute)]">
          Pulling the schedule, lines and rosters, then building 6 tiles at once. Takes about a minute. Keep this page open.
        </p>
      ) : null}
      {error ? <p className="mb-4 border border-[var(--color-red)] px-3 py-2 text-[0.9rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {note ? <p className="mb-4 border border-[var(--color-amber)] px-3 py-2 text-[0.9rem] text-[var(--color-amber)]">{note}</p> : null}

      {items.length > 0
        ? groups.map((g) => (
            <section key={g.category} className="mb-10">
              <div className="mb-3 flex flex-wrap items-end gap-3 border-b border-[var(--color-line)] pb-2" style={{ borderBottomColor: TILE_TONE[g.category] }}>
                <div className="min-w-0 flex-1">
                  <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-black">
                    {CATEGORY_INFO[g.category].title}{" "}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--color-warm-mute)]">
                      {g.items.length} picks · {CATEGORY_INFO[g.category].points}
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run("draft_tile", { week, category: g.category }, `tile:${g.category}`)}
                  className={`${btn} border-[var(--color-line-strong)]`}
                >
                  {busy === `tile:${g.category}` ? "Redoing…" : g.items.length ? "Redo this tile" : "Draft this tile"}
                </button>
              </div>
              {g.items.length ? (
                <div className="grid grid-cols-1 gap-4 @min-[900px]:grid-cols-2">
                  {g.items.map((item) => (
                    <DraftCard key={item.id} item={item} now={now} busy={busy} run={run} />
                  ))}
                </div>
              ) : (
                <p className="text-[0.85rem] text-[var(--color-warm-mute)]">Empty. Tap &quot;Draft this tile&quot;.</p>
              )}
            </section>
          ))
        : null}

      <AddProp week={week} run={run} busy={busy} />
    </div>
  );
}

function DraftCard({
  item,
  now,
  busy,
  run,
}: {
  item: SbItem;
  now: number;
  busy: string | null;
  run: ReturnType<typeof useSbAction>["run"];
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(item.prompt);
  const [points, setPoints] = useState(item.points);
  const line = "line" in item.spec ? (item.spec as { line: number }).line : null;
  const [lineVal, setLineVal] = useState(line === null ? "" : String(line));
  const working = busy?.startsWith(item.id);

  return (
    <div className={`border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/50 p-4 ${working ? "opacity-60" : ""}`}>
      <CardHead item={item} now={now} />
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={prompt}
            maxLength={140}
            rows={2}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] p-2 text-[0.95rem]"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-[0.8rem] text-[var(--color-warm-mute)]">
              Points
              <input
                type="number"
                min={1}
                max={10}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="h-10 w-16 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-2 text-[var(--color-bone)]"
              />
            </label>
            {line !== null ? (
              <label className="flex items-center gap-2 text-[0.8rem] text-[var(--color-warm-mute)]">
                Line
                <input
                  type="number"
                  step="0.5"
                  value={lineVal}
                  onChange={(e) => setLineVal(e.target.value)}
                  className="h-10 w-24 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-2 text-[var(--color-bone)]"
                />
              </label>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await run(
                  "update_item",
                  { item_id: item.id, prompt, points, line: lineVal === "" ? undefined : Number(lineVal) },
                  `${item.id}:save`,
                );
                if (ok) setEditing(false);
              }}
              className={`${btn} border-[var(--color-red)] text-[var(--color-red)]`}
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={`${btn} border-[var(--color-line-strong)]`}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <CardPrompt item={item} />
          <ul className="mt-3 flex flex-col gap-1">
            {item.type === "closest" ? (
              <li className="text-[0.85rem] text-[var(--color-warm-mute)]">Everyone types a number. Closest wins.</li>
            ) : (
              item.options.map((o) => (
                <li key={o.key} className="flex items-center gap-2 text-[0.85rem]">
                  <TeamDot option={o} />
                  {o.label}
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => setEditing(true)} className={`${btn} border-[var(--color-line-strong)]`}>
              Edit
            </button>
            {item.type !== "custom" ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run("regenerate", { item_id: item.id }, `${item.id}:swap`)}
                className={`${btn} border-[var(--color-line-strong)]`}
              >
                {busy === `${item.id}:swap` ? "Swapping…" : "Swap for a new one"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("remove", { item_id: item.id }, `${item.id}:remove`)}
              className={`${btn} border-[var(--color-line)] text-[var(--color-warm-mute)]`}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Jaiye writes one question a week. Graded by hand on Monday. */
export function AddProp({
  week,
  run,
  busy,
}: {
  week: number;
  run: ReturnType<typeof useSbAction>["run"];
  busy: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [points, setPoints] = useState(2);
  const [locksAt, setLocksAt] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btn} mt-6 border-[var(--color-line-strong)]`}>
        + Add Jaiye&apos;s Prop
      </button>
    );
  }
  return (
    <div className="mt-6 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)]/50 p-4">
      <div className="font-[family-name:var(--font-fraunces)] text-lg font-black">Jaiye&apos;s Prop</div>
      <p className="mt-1 text-[0.85rem] text-[var(--color-warm-mute)]">Jaiye writes the question. You mark the answer on Monday.</p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={prompt}
          maxLength={140}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Will Wemby get 5+ blocks on Friday?"
          className="h-11 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-3"
        />
        {options.map((o, i) => (
          <input
            key={i}
            value={o}
            maxLength={40}
            onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={`Answer ${i + 1}`}
            className="h-11 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-3"
          />
        ))}
        {options.length < 4 ? (
          <button type="button" onClick={() => setOptions([...options, ""])} className="self-start text-[0.8rem] text-[var(--color-warm-mute)]">
            + another answer
          </button>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-[0.8rem] text-[var(--color-warm-mute)]">
            Points
            <select
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="h-10 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-2 text-[var(--color-bone)]"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[0.8rem] text-[var(--color-warm-mute)]">
            Locks at
            <input
              type="datetime-local"
              value={locksAt}
              onChange={(e) => setLocksAt(e.target.value)}
              className="h-10 border border-[var(--color-line-strong)] bg-[var(--color-warm-surface)] px-2 text-[var(--color-bone)]"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              const ok = await run("add_prop", {
                week,
                prompt,
                options,
                points,
                locks_at: locksAt ? new Date(locksAt).toISOString() : "",
              });
              if (ok) {
                setOpen(false);
                setPrompt("");
                setOptions(["", ""]);
              }
            }}
            className={`${btn} border-[var(--color-red)] text-[var(--color-red)]`}
          >
            Add it
          </button>
          <button type="button" onClick={() => setOpen(false)} className={`${btn} border-[var(--color-line-strong)]`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
