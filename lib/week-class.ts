import { weekStart, isoDate } from "@/lib/week";

export type WeekKind = "past" | "current" | "upcoming";

export function classifyWeek(viewedStart: Date): WeekKind {
  const currentStart = isoDate(weekStart());
  const viewed = isoDate(viewedStart);
  if (viewed < currentStart) return "past";
  if (viewed > currentStart) return "upcoming";
  return "current";
}
