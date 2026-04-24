import EpaHistoryLesson from "@/lessons/epa-history";

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
};

export type LessonSlug = keyof typeof LESSONS;

export function getLesson(slug: string): LessonMeta | null {
  return LESSONS[slug] ?? null;
}
