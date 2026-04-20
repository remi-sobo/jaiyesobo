import type { Metadata } from "next";
import { requireKid } from "@/lib/session";
import { getJaiye } from "@/lib/data";
import { calculateStreak } from "@/lib/streak";
import { getWeekTasks, getWeekStatus } from "@/lib/admin-data";
import { classifyWeek } from "@/lib/week-class";
import {
  isoDate,
  weekStart,
  addDays,
  addWeeks,
  isoWeekNumber,
  monthDayLabel,
} from "@/lib/week";
import WeekView from "@/components/me/week-view";
import TodayHeader from "@/components/me/today-header";
import BottomNav from "@/components/me/bottom-nav";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Jaiye · This Week",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ w?: string }> };

export default async function WeekPage({ searchParams }: Props) {
  const { w } = await searchParams;
  await requireKid(w ? `/me/week?w=${w}` : "/me/week");
  const jaiye = await getJaiye();
  if (!jaiye) redirect("/me");

  const start = w ? new Date(`${w}T00:00:00`) : weekStart();
  const currentStart = weekStart();
  const startIso = isoDate(start);
  const endIso = isoDate(addDays(start, 6));
  const weekNumber = isoWeekNumber(start);
  const weekLabel = `${monthDayLabel(start)}–${new Date(`${endIso}T00:00:00`).getDate()}`;

  const kind = classifyWeek(start);
  const [days, status, streak] = await Promise.all([
    getWeekTasks(jaiye.id, start),
    getWeekStatus(startIso),
    calculateStreak(jaiye.id),
  ]);

  const published = status.status === "published";
  const breadcrumb =
    kind === "current"
      ? "This week"
      : kind === "past"
      ? breadcrumbForPast(start, currentStart)
      : breadcrumbForUpcoming(start, currentStart);

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
      <TodayHeader greetingName={jaiye.display_name} streak={streak.current} bestStreak={streak.best} />

      <WeekView
        kind={kind}
        weekStartDate={startIso}
        weekEndDate={endIso}
        weekNumber={weekNumber}
        weekLabel={weekLabel}
        days={days}
        published={published}
        prevWeekStart={isoDate(addWeeks(start, -1))}
        nextWeekStart={isoDate(addWeeks(start, 1))}
        currentWeekStart={isoDate(currentStart)}
        breadcrumb={breadcrumb}
      />

      <BottomNav />
    </main>
  );
}

function breadcrumbForPast(viewed: Date, current: Date): string {
  const diffWeeks = Math.round((current.getTime() - viewed.getTime()) / (7 * 24 * 3600 * 1000));
  if (diffWeeks === 1) return "Past · Last week";
  return `Past · ${diffWeeks} weeks ago`;
}

function breadcrumbForUpcoming(viewed: Date, current: Date): string {
  const diffWeeks = Math.round((viewed.getTime() - current.getTime()) / (7 * 24 * 3600 * 1000));
  if (diffWeeks === 1) return "Upcoming · Next week";
  return `Upcoming · In ${diffWeeks} weeks`;
}
