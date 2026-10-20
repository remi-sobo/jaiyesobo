"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TEAMS, type Conference, type TeamCode } from "@/lib/nba/teams";
import type { PredictionPicks } from "@/lib/nba/types";
import { TeamChip } from "../team-tile";
import type { UpdatePicks } from "./builder";
import { StepIntro } from "./ui";

const ZONES: Record<number, { label: string; tone: string }> = {
  0: { label: "Playoffs", tone: "var(--color-green)" },
  6: { label: "Play-In", tone: "var(--color-amber)" },
  10: { label: "Lottery", tone: "var(--color-warm-mute)" },
};

function zoneTone(i: number) {
  return i < 6 ? ZONES[0].tone : i < 10 ? ZONES[6].tone : ZONES[10].tone;
}

function Row({
  code,
  index,
  total,
  move,
}: {
  code: TeamCode;
  index: number;
  total: number;
  move: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: code,
  });
  const t = TEAMS[code];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, borderLeftColor: zoneTone(index) }}
      className={`relative flex items-center gap-2 border border-l-4 border-[var(--color-line)] bg-[var(--color-warm-surface)] py-1.5 pr-1.5 pl-1 ${
        isDragging ? "z-10 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-[var(--color-red)]" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${t.name}`}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--color-warm-mute)] active:cursor-grabbing"
      >
        <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden>
          {[3, 9, 15].map((y) => (
            <g key={y}>
              <circle cx="3" cy={y} r="1.5" fill="currentColor" />
              <circle cx="9" cy={y} r="1.5" fill="currentColor" />
            </g>
          ))}
        </svg>
      </button>
      <span className="w-6 shrink-0 text-right font-[family-name:var(--font-jetbrains)] text-[0.9rem] font-medium text-[var(--color-bone)]">
        {index + 1}
      </span>
      <TeamChip code={code} />
      <span className="min-w-0 flex-1 truncate text-[0.9rem]">
        <span className="text-[var(--color-warm-mute)]">{t.city} </span>
        {t.name}
      </span>
      <div className="flex shrink-0 gap-1">
        <ArrowButton label={`Move ${t.name} up`} disabled={index === 0} onClick={() => move(index, index - 1)} dir="up" />
        <ArrowButton
          label={`Move ${t.name} down`}
          disabled={index === total - 1}
          onClick={() => move(index, index + 1)}
          dir="down"
        />
      </div>
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  dir,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  dir: "up" | "down";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-10 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:border-[var(--color-red)] disabled:opacity-25 disabled:hover:border-[var(--color-line-strong)]"
    >
      <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden className={dir === "down" ? "rotate-180" : ""}>
        <path d="M1 7 L6 2 L11 7" stroke="currentColor" strokeWidth="1.6" fill="none" />
      </svg>
    </button>
  );
}

function ConferenceList({
  conf,
  order,
  onChange,
}: {
  conf: Conference;
  order: TeamCode[];
  onChange: (next: TeamCode[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id as TeamCode);
    const to = order.indexOf(over.id as TeamCode);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(order, from, to));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    onChange(arrayMove(order, from, to));
  }

  return (
    <div>
      <h2 className="mb-3 font-[family-name:var(--font-fraunces)] text-2xl font-black tracking-[-0.02em]">
        {conf === "west" ? "West" : "East"}
      </h2>
      <DndContext id={`standings-${conf}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {order.map((code, i) => (
              <div key={code}>
                {ZONES[i] ? (
                  <div className={`flex items-center gap-2 pb-1.5 ${i === 0 ? "" : "pt-3"}`}>
                    <span className="h-px w-5" style={{ background: ZONES[i].tone }} />
                    <span
                      className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em]"
                      style={{ color: ZONES[i].tone }}
                    >
                      {ZONES[i].label}
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-warm-dim)]">
                      {i === 0 ? "1-6" : i === 6 ? "7-10" : "11-15"}
                    </span>
                  </div>
                ) : null}
                <Row code={code} index={i} total={order.length} move={move} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default function StandingsStep({ picks, update }: { picks: PredictionPicks; update: UpdatePicks }) {
  const set = (conf: Conference) => (next: TeamCode[]) =>
    update((p) => ({ ...p, standings: { ...p.standings, [conf]: next } }), "standings");
  return (
    <div>
      <StepIntro title="Rank every team." accent="every">
        Put all 15 teams in order, best to worst. Drag the dots or tap the arrows.
      </StepIntro>
      <div className="grid grid-cols-1 gap-10 @min-[760px]:grid-cols-2 @min-[760px]:gap-8">
        <ConferenceList conf="west" order={picks.standings.west} onChange={set("west")} />
        <ConferenceList conf="east" order={picks.standings.east} onChange={set("east")} />
      </div>
    </div>
  );
}
