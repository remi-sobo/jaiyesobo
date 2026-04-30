import { requireKid } from "@/lib/session";
import {
  getJaiye,
  getTasksForDay,
  getDadNoteForDay,
  getPendingQuestionCount,
  todayIso,
} from "@/lib/data";
import { calculateStreak } from "@/lib/streak";
import { isDatePublished, getUnseenAnswer, getUnseenFeedbackReply } from "@/lib/admin-data";
import { getAllAnchorsForUser } from "@/lib/anchors";
import { expandAnchorsForDate } from "@/lib/schedule";
import TodayHeader from "@/components/me/today-header";
import SummaryCard from "@/components/me/summary-card";
import DadsNote from "@/components/me/dads-note";
import AskDadCard from "@/components/me/ask-dad-card";
import BottomNav from "@/components/me/bottom-nav";
import AnsweredQuestion from "@/components/me/answered-question";
import FeedbackReply from "@/components/me/feedback-reply";
import ScheduleView from "@/components/me/schedule/schedule-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requireKid();

  const jaiye = await getJaiye();
  if (!jaiye) return <SeedMissing />;

  const date = todayIso();
  const [
    rawTasks,
    dadNote,
    pending,
    streakResult,
    published,
    answered,
    feedbackReply,
    allAnchors,
  ] = await Promise.all([
    getTasksForDay(jaiye.id, date),
    getDadNoteForDay(date),
    getPendingQuestionCount(jaiye.id),
    calculateStreak(jaiye.id),
    isDatePublished(date),
    getUnseenAnswer(jaiye.id),
    getUnseenFeedbackReply(jaiye.id),
    getAllAnchorsForUser(jaiye.id),
  ]);

  const tasks = published ? rawTasks : [];
  // Anchors are info-only — they NEVER count toward completion %.
  const total = tasks.length;
  const done = tasks.filter((t) => t.completion).length;
  const scheduledTasks = tasks.filter((t) => !!t.scheduled_time);
  const unscheduledTasks = tasks.filter((t) => !t.scheduled_time);
  const todaysAnchors = published
    ? expandAnchorsForDate(allAnchors, new Date(`${date}T00:00:00`))
    : [];

  return (
    <main className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
      <TodayHeader
        greetingName={jaiye.display_name}
        streak={streakResult.current}
        bestStreak={streakResult.best}
      />

      {!published && (
        <div className="p-12 rounded border border-dashed border-[var(--color-line-strong)] text-center text-[var(--color-warm-mute)] mb-14">
          <div className="font-[family-name:var(--font-fraunces)] italic text-xl text-[var(--color-warm-bone)] mb-3">
            Dad is still writing your week.
          </div>
          <p className="text-sm leading-relaxed">
            Come back soon. Nothing goes live until he publishes.
          </p>
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

      {published && total === 0 && todaysAnchors.length === 0 && (
        <div className="p-10 border border-dashed border-[var(--color-line-strong)] rounded text-center text-[var(--color-warm-mute)]">
          No tasks today. Take a breath.
        </div>
      )}

      {published && (total > 0 || todaysAnchors.length > 0) && (
        <ScheduleView
          scheduledTasks={scheduledTasks}
          unscheduledTasks={unscheduledTasks}
          anchors={todaysAnchors}
        />
      )}

      {dadNote && <DadsNote body={dadNote.body} />}
      <AskDadCard pendingCount={pending} />
      <BottomNav />
    </main>
  );
}

function SeedMissing() {
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
