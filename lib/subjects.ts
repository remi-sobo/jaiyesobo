/**
 * Subjects are a UNION across all kids (Jaiye + Kemi) for color-lookup
 * purposes. The picker UIs (admin task editor, etc.) use `getSubjectsForKid`
 * to scope which keys appear for the active kid.
 *
 * Kemi-specific colors are sampled to align with her live public-site pillar
 * colors (kemisobo arch doc, decision log 2026-04-30):
 *   - Studio (Art)   = peach #E8956A
 *   - Stage (Music)  = green #7BA05B
 *   - Style          = pink  #C83C78
 *   - Stories (writing on her side) — keeps the universal lavender for now
 */
export const SUBJECTS = {
  // Universal (both kids)
  math: { label: "Math", hex: "#f4a261", cssVar: "--color-math" },
  reading: { label: "Reading", hex: "#6b9bd2", cssVar: "--color-reading" },
  writing: { label: "Writing", hex: "#a084dc", cssVar: "--color-writing" },
  habit: { label: "Habit", hex: "#8a8578", cssVar: "--color-habit" },
  family: { label: "Family", hex: "#e8b04e", cssVar: "--color-family" },
  other: { label: "Other", hex: "#8a8578", cssVar: "--color-mute" },
  // Jaiye-specific
  science: { label: "Science", hex: "#4ade80", cssVar: "--color-science" },
  history: { label: "History", hex: "#c9a36b", cssVar: "--color-history" },
  ball: { label: "Ball", hex: "#E63946", cssVar: "--color-ball" },
  // Kemi-specific (aligned with her live pillar colors)
  art: { label: "Art", hex: "#E8956A", cssVar: "--color-art" },
  music: { label: "Music", hex: "#7BA05B", cssVar: "--color-music" },
  style: { label: "Style", hex: "#C83C78", cssVar: "--color-style" },
  logic: { label: "Logic", hex: "#1E5762", cssVar: "--color-logic" },
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
export const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[];

const JAIYE_SUBJECT_KEYS: SubjectKey[] = [
  "math",
  "reading",
  "writing",
  "science",
  "history",
  "ball",
  "habit",
  "family",
  "other",
];

const KEMI_SUBJECT_KEYS: SubjectKey[] = [
  "math",
  "reading",
  "writing",
  "logic",
  "art",
  "music",
  "style",
  "habit",
  "family",
  "other",
];

/** Subset of SUBJECTS appropriate for the given kid's task picker. */
export function getSubjectsForKid(kidName: string | undefined | null): SubjectKey[] {
  const n = (kidName ?? "").toLowerCase();
  if (n === "kemi") return KEMI_SUBJECT_KEYS;
  return JAIYE_SUBJECT_KEYS;
}

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
