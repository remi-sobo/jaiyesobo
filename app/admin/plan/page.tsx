import { requireAdmin } from "@/lib/session";
import {
  ensureJaiye,
  getWeekTasks,
  getWeekStatus,
  getWeeklyBrief,
  getDadNoteBody,
  getPendingUploads,
  getQuestions,
} from "@/lib/admin-data";
import { isoDate, weekStart, addDays, addWeeks, isoWeekNumber, monthDayLabel, todayIso } from "@/lib/week";
import PlanView from "@/components/admin/plan-view";
import AnchorEditor from "@/components/admin/anchor-editor";
import { getAllAnchorsForUser } from "@/lib/anchors";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ w?: string }> };

export default async function PlanPage({ searchParams }: Props) {
  await requireAdmin();
  const jaiye = await ensureJaiye();
  const { w } = await searchParams;

  const start = w ? new Date(`${w}T00:00:00`) : weekStart();
  const startIso = isoDate(start);
  const endIso = isoDate(addDays(start, 6));
  const weekLabel = `Week of ${monthDayLabel(start)}`;
  const weekNumber = isoWeekNumber(start);

  const todayStr = todayIso();
  const tomorrowStr = isoDate(addDays(new Date(`${todayStr}T00:00:00`), 1));

  const [days, status, brief, todayNote, tomorrowNote, uploads, questions, anchors] = await Promise.all([
    getWeekTasks(jaiye.id, start),
    getWeekStatus(startIso),
    getWeeklyBrief(startIso),
    getDadNoteBody(todayStr),
    getDadNoteBody(tomorrowStr),
    getPendingUploads(jaiye.id),
    getQuestions(jaiye.id),
    getAllAnchorsForUser(jaiye.id),
  ]);

  return (
    <>
      <PlanView
        weekStartDate={startIso}
        weekEndDate={endIso}
        weekNumber={weekNumber}
        weekLabel={weekLabel}
        days={days}
        status={status}
        brief={brief}
        todayDate={todayStr}
        tomorrowDate={tomorrowStr}
        todayNote={todayNote}
        tomorrowNote={tomorrowNote}
        uploads={uploads}
        questions={questions}
        prevWeekStart={isoDate(addWeeks(start, -1))}
        nextWeekStart={isoDate(addWeeks(start, 1))}
      />
      <div className="px-8 lg:px-10 pb-24 max-w-[1200px]">
        <AnchorEditor initial={anchors} />
      </div>
    </>
  );
}
