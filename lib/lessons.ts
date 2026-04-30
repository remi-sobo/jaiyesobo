import EpaHistoryLesson from "@/lessons/epa-history";
import SportsJournalistLab from "@/lessons/sports-journalist-lab";
import GamesCuratorOnboarding from "@/lessons/games-curator-onboarding";

export type LessonMeta = {
  component: React.ComponentType<{ taskId: string }>;
  title: string;
  subject: string;
  estimatedMinutes: number;
};

export const LESSONS: Record<string, LessonMeta> = {
  "epa-history": {
    component: EpaHistoryLesson,
    title: "The Story of East Palo Alto",
    subject: "history",
    estimatedMinutes: 45,
  },
  "sports-journalist-lab": {
    component: SportsJournalistLab,
    title: "Sports Desk: Playoff Recap",
    subject: "writing",
    estimatedMinutes: 60,
  },
  "games-curator-onboarding": {
    component: GamesCuratorOnboarding,
    title: "Games Platform — Curator Onboarding",
    subject: "other",
    estimatedMinutes: 30,
  },
};

export type LessonSlug = keyof typeof LESSONS;

export function getLesson(slug: string): LessonMeta | null {
  return LESSONS[slug] ?? null;
}
