export const TRIVIA_CATEGORIES = {
  "the-books": { name: "The Books", tagline: "Numbers don't lie." },
  "draft-class": { name: "Draft Class", tagline: "How they got in the league." },
  "by-the-numbers": { name: "By The Numbers", tagline: "Every number tells a story." },
  "mystery-player": { name: "Mystery Player", tagline: "Three clues. One name." },
  "wherehe-played": { name: "Where'd He Play?", tagline: "Follow the trade tree." },
  franchise: { name: "Franchise", tagline: "Every franchise has a story." },
  "the-hall": { name: "The Hall", tagline: "Old school, new school." },
  hardware: { name: "Hardware", tagline: "They earned the trophy." },
} as const;

export type TriviaCategoryKey = keyof typeof TRIVIA_CATEGORIES;

export const TRIVIA_DIFFICULTIES = {
  easy: {
    name: "Easy",
    description: "Even casual fans know these.",
    weights: { easy: 7, medium: 3, hard: 0, extreme: 0 },
    dots: 1,
  },
  medium: {
    name: "Medium",
    description: "Real fans, no problem.",
    weights: { easy: 2, medium: 6, hard: 2, extreme: 0 },
    dots: 2,
  },
  hard: {
    name: "Hard",
    description: "Now we're separating fans.",
    weights: { easy: 0, medium: 3, hard: 6, extreme: 1 },
    dots: 3,
  },
  extreme: {
    name: "Extreme",
    description: "Die-hards only.",
    weights: { easy: 0, medium: 1, hard: 5, extreme: 4 },
    dots: 4,
  },
} as const;

export type TriviaDifficultyKey = keyof typeof TRIVIA_DIFFICULTIES;

export const TRIVIA_ROAST_LINES = {
  perfect: [
    "Hall of Fame stuff. They're hanging your jersey.",
    "Untouchable. The whole league is watching.",
    "Pure swish. Not even close to wrong.",
    "MVP type stuff. Carry your team.",
  ],
  strong: [
    "Real fan. Real knowledge.",
    "Closer than the playoffs. You know your stuff.",
    "All-Star season for sure.",
    "One bad shot. Still a banger of a game.",
  ],
  middle: [
    "You watch the playoffs. You miss the regular season.",
    "You're fine. But fine isn't a championship.",
    "Solid game off the bench.",
    "More homework. Less highlight reels.",
  ],
  rough: [
    "Bandwagon alert. Where you been?",
    "You only know whoever's on TV right now, huh.",
    "Tough night. Shake it off.",
    "Open the NBA app, my guy.",
  ],
  disaster: [
    "Did you watch ONE game?",
    "Cap. Cap. Cap. Cap.",
    "Press conference time. Explain yourself.",
    "You sure you like basketball?",
  ],
} as const;

export type RoastTier = keyof typeof TRIVIA_ROAST_LINES;

export function getRoastTier(score: number): RoastTier {
  if (score === 10) return "perfect";
  if (score >= 8) return "strong";
  if (score >= 5) return "middle";
  if (score >= 3) return "rough";
  return "disaster";
}

export function getRoastLine(score: number): string {
  const tier = getRoastTier(score);
  const lines = TRIVIA_ROAST_LINES[tier];
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Streak emoji escalator. */
export function streakIcon(streak: number): string {
  if (streak >= 14) return "🔥🔥🔥";
  if (streak >= 7) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return "";
}
