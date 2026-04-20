import { requireKid } from "@/lib/session";
import {
  getJaiye,
  getTasksForDay,
  getDadNoteForDay,
  getPendingQuestionCount,
  todayIso,
  type Task,
} from "@/lib/data";
import { calculateStreak } from "@/lib/streak";
import { isDatePublished, getUnseenAnswer } from "@/lib/admin-data";
import TodayHeader from "@/components/me/today-header";
import SummaryCard from "@/components/me/summary-card";
import TaskCard from "@/components/me/task-card";
import DadsNote from "@/components/me/dads-note";
import AskDadCard from "@/components/me/ask-dad-card";
import BottomNav from "@/components/me/bottom-nav";
import AnsweredQuestion from "@/components/me/answered-question";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requireKid();

  const jaiye = await getJaiye();
  if (!jaiye) {
    return <SeedMissing />;
  }

  const date = todayIso();
  const [rawTasks, dadNote, pending, streak, published, answered] = await Promise.all([
    getTasksForDay(jaiye.id, date),
    getDadNoteForDay(date),
    getPendingQuestionCount(jaiye.id),
    calculateStreak(jaiye.id),
    isDatePublished(date),
    getUnseenAnswer(jaiye.id),
  ]);

  const tasks = published ? rawTasks : [];

  const total = tasks.length;
  const done = tasks.filter((t) => t.completion).length;

  const homeschoolTypes = new Set(["homeschool"]);
  const homeschool = tasks.filter((t) => homeschoolTypes.has(t.type));
  const restOfDay = tasks.filter((t) => !homeschoolTypes.has(t.type));

  const homeschoolLeft = homeschool.filter((t) => !t.completion).length;
  const restLeft = restOfDay.filter((t) => !t.completion).length;

  return (
    <main className="max-w-[1100px] mx-auto px-6 lg:px-8 py-8">
      <TodayHeader greetingName={jaiye.display_name} streak={streak} />

      {!published && (
        <div className="p-8 rounded border border-dashed border-[var(--color-line-strong)] text-center text-[var(--color-warm-mute)] mb-10">
          <div className="font-[family-name:var(--font-fraunces)] italic text-xl text-[var(--color-warm-bone)] mb-2">
            Dad is still writing your week.
          </div>
          <p className="text-sm">Come back soon. Nothing goes live until he publishes.</p>
        </div>
      )}

      {published && total > 0 && <SummaryCard done={done} total={total} />}

      {answered && answered.answer && (
        <AnsweredQuestion
          questionId={answered.id}
          question={answered.body}
          answer={answered.answer}
          answeredAt={answered.answered_at ?? answered.asked_at}
        />
      )}

      {published && homeschool.length > 0 && (
        <>
          <SectionHeader title="Homeschool" right={homeschoolLeft === 0 ? "all done" : `${homeschoolLeft} left`} />
          <TaskList tasks={homeschool} />
        </>
      )}

      {published && restOfDay.length > 0 && (
        <>
          <SectionHeader
            title="Rest of Day"
            right={restLeft === 0 ? "all done" : `${restLeft} left`}
            spacedTop={homeschool.length > 0}
          />
          <TaskList tasks={restOfDay} />
        </>
      )}

      {published && total === 0 && (
        <div className="p-10 border border-dashed border-[var(--color-line-strong)] rounded text-center text-[var(--color-warm-mute)]">
          No tasks today. Take a breath.
        </div>
      )}

      {dadNote && <DadsNote body={dadNote.body} />}

      <AskDadCard pendingCount={pending} />

      <BottomNav />
    </main>
  );
}

function SectionHeader({ title, right, spacedTop }: { title: string; right: string; spacedTop?: boolean }) {
  return (
    <div className={`flex items-center justify-between mb-5 ${spacedTop ? "mt-10" : ""}`}>
      <h3 className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        {title}
      </h3>
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] tracking-[0.1em] text-[var(--color-warm-mute)]">
        {right}
      </span>
    </div>
  );
}

// Spacing cheat-sheet matching docs/mockups/jaiye-me-today.html:
// - task card gap: 0.75rem (gap-3)
// - task card padding: 1.25rem y / 1.5rem x (py-5 px-6)
// - section header to next section: 2.5rem (mt-10) — first section has no top margin
// - Dad's note top margin: 3rem (mt-12)
// - Ask Dad card top margin: 3rem (mt-12)
// - Summary card padding: 2rem (p-8)

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-3">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}

function SeedMissing() {
  return (
    <main className="max-w-[640px] mx-auto px-6 py-24">
      <div className="p-8 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)]">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">
          No Jaiye <span className="italic text-[var(--color-red)]">yet.</span>
        </h2>
        <p className="text-[var(--color-warm-mute)] mb-4">
          The database is reachable but the seed hasn&apos;t been run. From the project root:
        </p>
        <pre className="bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded p-3 font-[family-name:var(--font-jetbrains)] text-xs text-[var(--color-warm-bone)] overflow-x-auto">
{`npx tsx scripts/seed.ts`}
        </pre>
      </div>
    </main>
  );
}
