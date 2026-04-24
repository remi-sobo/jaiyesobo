export const SUBJECTS = {
  math: { label: "Math", hex: "#f4a261", cssVar: "--color-math" },
  reading: { label: "Reading", hex: "#6b9bd2", cssVar: "--color-reading" },
  writing: { label: "Writing", hex: "#a084dc", cssVar: "--color-writing" },
  science: { label: "Science", hex: "#4ade80", cssVar: "--color-science" },
  history: { label: "History", hex: "#c9a36b", cssVar: "--color-history" },
  ball: { label: "Ball", hex: "#E63946", cssVar: "--color-ball" },
  habit: { label: "Habit", hex: "#8a8578", cssVar: "--color-habit" },
  family: { label: "Family", hex: "#e8b04e", cssVar: "--color-family" },
  other: { label: "Other", hex: "#8a8578", cssVar: "--color-mute" },
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
export const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[];

/**
 * Normalize a task's subject/type pair into a SubjectKey for color lookup.
 * Strips suffixes like "Reading · 4pm" → "reading".
 */
export function subjectKeyFor(subject: string | null | undefined, type?: string | null): SubjectKey {
  if (subject) {
    const clean = subject.split("·")[0].trim().toLowerCase();
    if (clean === "scripture") return "habit";
    if (clean in SUBJECTS) return clean as SubjectKey;
  }
  if (type) {
    const t = type.toLowerCase();
    if (t === "ball") return "ball";
    if (t === "habit" || t === "chore") return "habit";
    if (t === "family") return "family";
  }
  return "other";
}

export function subjectHex(subject: string | null | undefined, type?: string | null): string {
  return SUBJECTS[subjectKeyFor(subject, type)].hex;
}
