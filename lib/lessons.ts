import EpaHistoryLesson from "@/lessons/epa-history";
import SportsJournalistLab from "@/lessons/sports-journalist-lab";
import GamesCuratorOnboarding from "@/lessons/games-curator-onboarding";
import GrammarNouns from "@/lessons/grammar-nouns";
import JuneteenthJaiyeLesson from "@/lessons/juneteenth-jaiye";

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
  // ── MCT-style English grammar series (NBA edition) ─────────────────
  // Each lesson is a self-contained file in /lessons. To add the next
  // one (e.g. grammar-verbs), copy grammar-nouns.tsx, change the slug
  // and content, register it here, and run scripts/grammar-assign.ts.
  "grammar-nouns": {
    component: GrammarNouns,
    title: "Nouns: The Names of Everything on the Court",
    subject: "english",
    estimatedMinutes: 30,
  },
  "juneteenth-jaiye": {
    component: JuneteenthJaiyeLesson,
    title: "Juneteenth — The Day Freedom Reached Texas",
    subject: "history",
    estimatedMinutes: 30,
  },
};

export type LessonSlug = keyof typeof LESSONS;

export function getLesson(slug: string): LessonMeta | null {
  return LESSONS[slug] ?? null;
}
