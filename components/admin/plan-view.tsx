"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DayBucket, PendingUpload, Question, WeekStatus } from "@/lib/admin-data";
import type { Task } from "@/lib/data";
import { SUBJECTS, subjectHex } from "@/lib/subjects";
import WeekGrid from "./week-grid";
import TaskEditDrawer from "./task-edit-drawer";
import WeeklyBrief from "./weekly-brief";
import DadsNoteEditor from "./dads-note-editor";
import PasteWeek from "./paste-week";

type Props = {
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  weekLabel: string;
  days: DayBucket[];
  status: WeekStatus;
  brief: string;
  todayDate: string;
  tomorrowDate: string;
  todayNote: string;
  tomorrowNote: string;
  uploads: PendingUpload[];
  questions: Question[];
  prevWeekStart: string;
  nextWeekStart: string;
  kidName: string;
  noteLabel: string;
};

const QUICK_ADD_CHIPS = [
  { label: "Math (30 min)", subject: "math", completion_type: "photo", type: "homeschool", title: "Math worksheet" },
  { label: "Big Nate reading", subject: "reading", completion_type: "photo", type: "homeschool", title: "Big Nate: next chapter" },
  { label: "Scripture memory", subject: "habit", completion_type: "reflection", type: "habit", title: "Scripture memory" },
  { label: "Ball practice (15 min)", subject: "ball", completion_type: "check", type: "ball", title: "Basketball practice — 15 min" },
  { label: "Make bed", subject: "habit", completion_type: "check", type: "habit", title: "Make your bed" },
] as const;

export default function PlanView(props: Props) {
  const router = useRouter();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pasting, setPasting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "publish" | "unpublish" | "duplicate">(null);
  const [isPending, startTransition] = useTransition();

  async function addQuickChip(chip: (typeof QUICK_ADD_CHIPS)[number]) {
    // Adds to Mon-Fri of the current week
    const dates = props.days.slice(0, 5).map((d) => d.date);
    startTransition(async () => {
      await Promise.all(
        dates.map((date) =>
          fetch("/api/admin/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date,
              title: chip.title,
              subject: SUBJECTS[chip.subject].label,
              type: chip.type,
              completion_type: chip.completion_type,
            }),
          })
        )
      );
      router.refresh();
    });
  }

  async function togglePublish() {
    const nextStatus = props.status.status === "published" ? "draft" : "published";
    try {
      await fetch("/api/admin/week-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: props.weekStartDate, status: nextStatus }),
      });
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function duplicateWeek() {
    try {
      await fetch("/api/admin/duplicate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: props.weekStartDate }),
      });
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  const totalTasks = props.days.reduce((n, d) => n + d.tasks.length, 0);

  return (
    <main className="p-8 lg:p-10 pb-24">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8 pb-6 border-b border-[var(--color-line)]">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em] leading-tight mb-1">
            Plan the <span className="italic font-normal text-[var(--color-red)]">week.</span>
          </h1>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            Admin · {props.weekLabel}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/me"
            target="_blank"
            className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm border border-transparent text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:border-[var(--color-line-strong)] transition-colors"
          >
            Preview as Jaiye ↗
          </Link>
          <button
            type="button"
            onClick={() => setPasting((v) => !v)}
            className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm border transition-colors ${
              pasting
                ? "bg-[var(--color-amber)] border-[var(--color-amber)] text-[var(--color-warm-bg)]"
                : "border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)]"
            }`}
          >
            {pasting ? "Close paste" : "Paste the week"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction("duplicate")}
            className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)] transition-colors"
          >
            Duplicate last week
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmAction(props.status.status === "published" ? "unpublish" : "publish")
            }
            className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm transition-colors ${
              props.status.status === "published"
                ? "bg-[var(--color-warm-surface-2)] text-[var(--color-bone)] border border-[var(--color-line-strong)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
                : "bg-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-soft)]"
            }`}
          >
            {props.status.status === "published" ? "Unpublish" : "Publish week"}
          </button>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex justify-between items-center mb-6 py-3 px-5 rounded bg-[var(--color-warm-surface)] border border-[var(--color-line)]">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/plan?w=${props.prevWeekStart}`}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:border-[var(--color-bone)] transition-colors"
            aria-label="Previous week"
          >
            ‹
          </Link>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-lg tracking-[-0.01em]">
            {props.weekLabel}
            <span className="text-[var(--color-warm-mute)] font-normal ml-3 text-[0.9rem]">
              · Week {props.weekNumber} of 2026
            </span>
          </div>
          <Link
            href={`/admin/plan?w=${props.nextWeekStart}`}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:border-[var(--color-bone)] transition-colors"
            aria-label="Next week"
          >
            ›
          </Link>
        </div>
        <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em]">
          {props.status.status === "published" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse" />
              <span>Published · Live for Jaiye</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)]" />
              <span>Draft · Hidden from Jaiye</span>
            </>
          )}
        </div>
      </div>

      {/* Weekly brief */}
      <WeeklyBrief weekStartDate={props.weekStartDate} initial={props.brief} />

      {/* Paste-the-week OR quick-add chips */}
      {pasting ? (
        <PasteWeek weekStartDate={props.weekStartDate} onClose={() => setPasting(false)} />
      ) : (
        <div className="flex gap-2 items-center flex-wrap mb-6">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mr-2">
            Add to every weekday:
          </span>
          {QUICK_ADD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={isPending}
              onClick={() => addQuickChip(chip)}
              className="inline-flex items-center gap-1.5 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-sm px-3 py-1.5 text-[0.75rem] text-[var(--color-warm-bone)] font-[family-name:var(--font-jetbrains)] hover:bg-[var(--color-warm-surface-2)] hover:text-[var(--color-bone)] transition-colors disabled:opacity-50"
            >
              <span className="text-[var(--color-red)]">+</span> {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Week grid */}
      <WeekGrid days={props.days} onOpenTask={(t) => setActiveTask(t)} />

      {totalTasks === 0 && (
        <div className="text-center py-12 text-[var(--color-warm-mute)] text-sm">
          No tasks yet this week. Use quick-add, duplicate last week, or paste the week.
        </div>
      )}

      {/* Bottom grid: note / Uploads / Ask Dad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-12">
        <Panel title={`${props.noteLabel} · Today + Tomorrow`}>
          <DadsNoteEditor
            label="Today"
            date={props.todayDate}
            initial={props.todayNote}
            kidName={props.kidName}
          />
          <div className="h-2" />
          <DadsNoteEditor
            label="Tomorrow"
            date={props.tomorrowDate}
            initial={props.tomorrowNote}
            kidName={props.kidName}
          />
        </Panel>

        <Panel
          title="Pending uploads"
          right={
            props.uploads.length > 0 ? (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-red)]">
                {props.uploads.length} new
              </span>
            ) : null
          }
        >
          {props.uploads.length === 0 ? (
            <p className="text-sm text-[var(--color-warm-mute)]">Nothing pending. When {props.kidName} uploads, it lands here.</p>
          ) : (
            <ul className="flex flex-col">
              {props.uploads.slice(0, 6).map((u) => (
                <li key={u.completion_id} className="flex items-center gap-3 py-2 border-b border-[var(--color-line)] last:border-none">
                  {!u.reviewed_at && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />}
                  <div
                    className="w-10 h-10 rounded bg-[var(--color-warm-surface-3)] shrink-0 flex items-center justify-center text-[var(--color-warm-mute)]"
                    style={{
                      backgroundImage: u.photo_thumbnails[0] ? `url(${u.photo_thumbnails[0]})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {!u.photo_thumbnails[0] && <span className="text-xs">📄</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] text-[var(--color-bone)] truncate">{u.task_title}</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.1em] text-[var(--color-warm-mute)]">
                      {u.subject ?? "—"} · {new Date(u.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-right">
            <Link href="/admin/uploads" className="text-[0.7rem] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors">
              View all →
            </Link>
          </div>
        </Panel>

        <Panel
          title="Ask Dad queue"
          right={
            props.questions.filter((q) => q.status === "pending").length > 0 ? (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-red)]">
                {props.questions.filter((q) => q.status === "pending").length} waiting
              </span>
            ) : null
          }
        >
          <AskDadInlineQueue questions={props.questions.slice(0, 4)} />
          <div className="mt-3 text-right">
            <Link href="/admin/ask-dad" className="text-[0.7rem] font-[family-name:var(--font-jetbrains)] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors">
              Full queue →
            </Link>
          </div>
        </Panel>
      </div>

      {/* Edit drawer */}
      <TaskEditDrawer task={activeTask} onClose={() => setActiveTask(null)} />

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          status={props.status.status}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction === "duplicate" ? duplicateWeek : togglePublish}
        />
      )}
    </main>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 flex flex-col">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-line)]">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          {title}
        </div>
        {right}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function AskDadInlineQueue({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function reply(id: string) {
    const answer = drafts[id]?.trim();
    if (!answer) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/questions/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      setDrafts((d) => ({ ...d, [id]: "" }));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (questions.length === 0) {
    return <p className="text-sm text-[var(--color-warm-mute)]">No questions. Quiet is good.</p>;
  }

  return (
    <div className="flex flex-col">
      {questions.map((q) => (
        <div key={q.id} className={`py-3 border-b border-[var(--color-line)] last:border-none ${q.status === "answered" ? "opacity-55" : ""}`}>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-warm-mute)] mb-1.5">
            {new Date(q.asked_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            {" · "}
            {q.status === "pending" ? "unread" : "answered"}
          </div>
          <div className="font-[family-name:var(--font-fraunces)] italic text-[0.9rem] leading-snug text-[var(--color-warm-bone)] mb-2">
            &ldquo;{q.body}&rdquo;
          </div>
          {q.status === "pending" && (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={drafts[q.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") reply(q.id);
                }}
                placeholder="Reply to Jaiye…"
                className="w-full bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1.5 text-sm text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
              />
              <button
                type="button"
                onClick={() => reply(q.id)}
                disabled={busy === q.id || !drafts[q.id]?.trim()}
                className="self-end bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-3 py-1.5 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 transition-colors"
              >
                {busy === q.id ? "…" : "Send reply"}
              </button>
            </div>
          )}
          {q.status === "answered" && q.answer && (
            <div className="text-sm text-[var(--color-warm-mute)] mt-1">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.15em] text-[var(--color-red)] mr-2">Dad:</span>
              {q.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({
  action,
  status,
  onCancel,
  onConfirm,
}: {
  action: "publish" | "unpublish" | "duplicate";
  status: "draft" | "published";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy =
    action === "publish"
      ? { title: "Publish this week?", body: "Tasks become visible on Jaiye's Today view immediately.", cta: "Publish", variant: "red" as const }
      : action === "unpublish"
      ? { title: "Unpublish this week?", body: "All tasks will disappear from Jaiye's Today view. You can publish again anytime.", cta: "Unpublish", variant: "red" as const }
      : { title: "Duplicate last week?", body: "Copies last week's tasks into this week (landing as draft). Any tasks currently here will be replaced.", cta: "Duplicate", variant: "amber" as const };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded max-w-[440px] w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-xl tracking-[-0.01em] mb-2">{copy.title}</h3>
        <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mb-6">{copy.body}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-5 py-2.5 rounded-sm text-[var(--color-bone)] transition-colors ${
              copy.variant === "red" ? "bg-[var(--color-red)] hover:bg-[var(--color-red-soft)]" : "bg-[var(--color-amber)] text-[var(--color-warm-bg)] hover:opacity-90"
            }`}
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
