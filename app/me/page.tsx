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
import { addDays, isoDate } from "@/lib/week";
import TodayHeader from "@/components/me/today-header";
import SummaryCard from "@/components/me/summary-card";
import DadsNote from "@/components/me/dads-note";
import AskDadCard from "@/components/me/ask-dad-card";
import BottomNav from "@/components/me/bottom-nav";
import AnsweredQuestion from "@/components/me/answered-question";
import FeedbackReply from "@/components/me/feedback-reply";
import ScheduleView from "@/components/me/schedule/schedule-view";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ d?: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function TodayPage({ searchParams }: Props) {
  await requireKid();

  const jaiye = await getJaiye();
  if (!jaiye) return <SeedMissing />;

  const { d: dParam } = await searchParams;
  const todayStr = todayIso();
  const date = dParam && DATE_RE.test(dParam) ? dParam : todayStr;
  const isToday = date === todayStr;

  const dateObj = new Date(`${date}T00:00:00`);

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
  const total = tasks.length;
  const done = tasks.filter((t) => t.completion).length;
  const scheduledTasks = tasks.filter((t) => !!t.scheduled_time);
  const unscheduledTasks = tasks.filter((t) => !t.scheduled_time);
  const dayAnchors = published ? expandAnchorsForDate(allAnchors, dateObj) : [];

  const prevDate = isoDate(addDays(dateObj, -1));
  const nextDate = isoDate(addDays(dateObj, 1));

  const weekdayLabel = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const relativeLabel = relativeDayLabel(date, todayStr);

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
            {isToday ? "Dad is still writing your week." : "This day isn't published yet."}
          </div>
          <p className="text-sm leading-relaxed">
            {isToday
              ? "Come back soon. Nothing goes live until he publishes."
              : "Use the prev/next buttons to find a published day."}
          </p>
        </div>
      )}

      {published && isToday && total > 0 && <SummaryCard done={done} total={total} />}

      {isToday && answered && answered.answer && (
        <AnsweredQuestion
          questionId={answered.id}
          question={answered.body}
          answer={answered.answer}
          answeredAt={answered.answered_at ?? answered.asked_at}
        />
      )}
      {isToday && feedbackReply && (
        <FeedbackReply
          feedbackId={feedbackReply.id}
          body={feedbackReply.body}
          reply={feedbackReply.reply}
          repliedAt={feedbackReply.replied_at}
        />
      )}

      <ScheduleView
        scheduledTasks={scheduledTasks}
        unscheduledTasks={unscheduledTasks}
        anchors={dayAnchors}
        viewedDate={date}
        isToday={isToday}
        prevHref={`/me?d=${prevDate}`}
        nextHref={`/me?d=${nextDate}`}
        todayHref="/me"
        weekdayLabel={weekdayLabel}
        dateLabel={dateLabel}
        relativeLabel={relativeLabel}
      />

      {published && total === 0 && dayAnchors.length === 0 && (
        <div className="p-10 border border-dashed border-[var(--color-line-strong)] rounded text-center text-[var(--color-warm-mute)] mt-6">
          {isToday ? "No tasks today. Take a breath." : "Nothing on this day."}
        </div>
      )}

      {dadNote && isToday && <DadsNote body={dadNote.body} />}
      <AskDadCard pendingCount={pending} />
      <BottomNav />
    </main>
  );
}

function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  const d = new Date(`${date}T00:00:00`);
  const t = new Date(`${today}T00:00:00`);
  const diffDays = Math.round((d.getTime() - t.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
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
