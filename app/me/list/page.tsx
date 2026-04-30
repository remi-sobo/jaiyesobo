import type { Metadata } from "next";
import Link from "next/link";
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
import { isDatePublished, getUnseenAnswer, getUnseenFeedbackReply } from "@/lib/admin-data";
import TodayHeader from "@/components/me/today-header";
import SummaryCard from "@/components/me/summary-card";
import TaskCard from "@/components/me/task-card";
import DadsNote from "@/components/me/dads-note";
import AskDadCard from "@/components/me/ask-dad-card";
import BottomNav from "@/components/me/bottom-nav";
import AnsweredQuestion from "@/components/me/answered-question";
import FeedbackReply from "@/components/me/feedback-reply";

export const metadata: Metadata = {
  title: "Jaiye · Today (list)",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function ListViewPage() {
  await requireKid();
  const jaiye = await getJaiye();
  if (!jaiye) {
    return (
      <main className="max-w-[640px] mx-auto px-6 py-24">
        <div className="p-8 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)]">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">
            No Jaiye <span className="italic text-[var(--color-red)]">yet.</span>
          </h2>
          <pre className="bg-[var(--color-warm-bg)] border border-[var(--color-line)] rounded p-3 font-[family-name:var(--font-jetbrains)] text-xs">
{`npx tsx scripts/seed.ts`}
          </pre>
        </div>
      </main>
    );
  }

  const date = todayIso();
  const [rawTasks, dadNote, pending, streakResult, published, answered, feedbackReply] =
    await Promise.all([
      getTasksForDay(jaiye.id, date),
      getDadNoteForDay(date),
      getPendingQuestionCount(jaiye.id),
      calculateStreak(jaiye.id),
      isDatePublished(date),
      getUnseenAnswer(jaiye.id),
      getUnseenFeedbackReply(jaiye.id),
    ]);

  const tasks = published ? rawTasks : [];
  const total = tasks.length;
  const done = tasks.filter((t) => t.completion).length;
  const homeschool = tasks.filter((t) => t.type === "homeschool");
  const restOfDay = tasks.filter((t) => t.type !== "homeschool");

  return (
    <main className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
      <TodayHeader
        greetingName={jaiye.display_name}
        streak={streakResult.current}
        bestStreak={streakResult.best}
      />

      <div className="flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-6">
        <span className="text-[var(--color-warm-mute)]">List view · backup</span>
        <Link
          href="/me"
          className="text-[var(--color-warm-mute)] hover:text-[var(--color-red)] transition-colors"
        >
          ← Schedule view
        </Link>
      </div>

      {!published && (
        <div className="p-12 rounded border border-dashed border-[var(--color-line-strong)] text-center text-[var(--color-warm-mute)] mb-14">
          <div className="font-[family-name:var(--font-fraunces)] italic text-xl text-[var(--color-warm-bone)] mb-3">
            Dad is still writing your week.
          </div>
          <p className="text-sm leading-relaxed">Come back soon. Nothing goes live until he publishes.</p>
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
      {feedbackReply && (
        <FeedbackReply
          feedbackId={feedbackReply.id}
          body={feedbackReply.body}
          reply={feedbackReply.reply}
          repliedAt={feedbackReply.replied_at}
        />
      )}

      {published && homeschool.length > 0 && (
        <>
          <SectionHeader title="Homeschool" right={`${homeschool.filter((t) => !t.completion).length} left`} />
          <TaskList tasks={homeschool} />
        </>
      )}
      {published && restOfDay.length > 0 && (
        <>
          <SectionHeader
            title="Rest of Day"
            right={`${restOfDay.filter((t) => !t.completion).length} left`}
            spacedTop={homeschool.length > 0}
          />
          <TaskList tasks={restOfDay} />
        </>
      )}

      {dadNote && <DadsNote body={dadNote.body} />}
      <AskDadCard pendingCount={pending} />
      <BottomNav />
    </main>
  );
}

function SectionHeader({ title, right, spacedTop }: { title: string; right: string; spacedTop?: boolean }) {
  return (
    <div className={`flex items-center justify-between mb-7 ${spacedTop ? "mt-16" : "mt-4"}`}>
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

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-4">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}
