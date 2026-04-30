/**
 * Seed 40 trivia questions into game_content.
 * Idempotent on question text — skips if already present.
 *
 * Run: npx tsx scripts/seed-trivia-questions.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Difficulty = "easy" | "medium" | "hard" | "extreme";

type Q = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: Difficulty;
  category: string;
};

const QUESTIONS: Q[] = [
  // ===== THE BOOKS =====
  {
    question: "Who scored 100 points in a single NBA game?",
    options: ["Michael Jordan", "Kareem Abdul-Jabbar", "Wilt Chamberlain", "Kobe Bryant"],
    correct_index: 2,
    explanation:
      "Wilt Chamberlain dropped 100 on the New York Knicks on March 2, 1962. Still the only triple-digit scoring game in NBA history.",
    difficulty: "easy",
    category: "the-books",
  },
  {
    question: "Who holds the NBA's all-time regular-season scoring record?",
    options: ["Kareem Abdul-Jabbar", "Karl Malone", "Kobe Bryant", "LeBron James"],
    correct_index: 3,
    explanation:
      "LeBron passed Kareem in February 2023. The record might keep moving as long as he plays.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Which team holds the record for most NBA championships?",
    options: ["Los Angeles Lakers", "Boston Celtics", "Chicago Bulls", "Golden State Warriors"],
    correct_index: 1,
    explanation:
      "The Celtics have 18 titles. The Lakers have 17. They've combined for over a third of all NBA championships.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who holds the NBA single-season record for triple-doubles?",
    options: ["Magic Johnson", "Oscar Robertson", "Russell Westbrook", "Nikola Jokić"],
    correct_index: 2,
    explanation:
      "Westbrook had 42 triple-doubles in the 2016-17 season. He averaged a triple-double for the season too.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Who holds the record for most career playoff points?",
    options: ["Michael Jordan", "Kareem Abdul-Jabbar", "LeBron James", "Kobe Bryant"],
    correct_index: 2,
    explanation:
      "LeBron has the most career playoff points by a wide margin — over 8,000 — thanks to a record number of Finals appearances.",
    difficulty: "extreme",
    category: "the-books",
  },

  // ===== DRAFT CLASS =====
  {
    question: "Who was the #1 overall pick in the 2003 NBA Draft?",
    options: ["Carmelo Anthony", "Dwyane Wade", "Chris Bosh", "LeBron James"],
    correct_index: 3,
    explanation:
      "The 2003 draft is one of the most legendary in history. LeBron, Wade, Bosh, and Melo all came from it.",
    difficulty: "easy",
    category: "draft-class",
  },
  {
    question: "Which team drafted Kobe Bryant in 1996?",
    options: ["Los Angeles Lakers", "Charlotte Hornets", "Philadelphia 76ers", "Chicago Bulls"],
    correct_index: 1,
    explanation:
      "Charlotte drafted Kobe at #13 and immediately traded him to the Lakers for Vlade Divac.",
    difficulty: "medium",
    category: "draft-class",
  },
  {
    question: "Who was the #1 pick in the 1984 NBA Draft, the same draft as Michael Jordan?",
    options: ["Hakeem Olajuwon", "Charles Barkley", "John Stockton", "Sam Bowie"],
    correct_index: 0,
    explanation:
      "Olajuwon went #1 to Houston. Sam Bowie went #2 to Portland. Jordan went #3 to Chicago — one of the biggest draft what-ifs ever.",
    difficulty: "medium",
    category: "draft-class",
  },
  {
    question: "Who was the #1 overall pick in the 2014 NBA Draft?",
    options: ["Jabari Parker", "Joel Embiid", "Andrew Wiggins", "Aaron Gordon"],
    correct_index: 2,
    explanation:
      "Wiggins went #1 to Cleveland and was traded to Minnesota for Kevin Love before he played a game.",
    difficulty: "hard",
    category: "draft-class",
  },
  {
    question: "Who was selected #1 overall in the 1979 NBA Draft?",
    options: ["Larry Bird", "Magic Johnson", "Bill Cartwright", "Sidney Moncrief"],
    correct_index: 1,
    explanation:
      "Magic went #1 to the Lakers. Larry Bird had been drafted the year before but stayed in college, joining the Celtics in 1979 too.",
    difficulty: "extreme",
    category: "draft-class",
  },

  // ===== BY THE NUMBERS =====
  {
    question: "What jersey number did Michael Jordan wear most of his career?",
    options: ["33", "32", "23", "45"],
    correct_index: 2,
    explanation:
      "Jordan briefly wore 45 when he came back from his first retirement, but 23 is the number that became iconic.",
    difficulty: "easy",
    category: "by-the-numbers",
  },
  {
    question: "What jersey number did Kobe Bryant wear when he won his first three championships?",
    options: ["24", "8", "33", "13"],
    correct_index: 1,
    explanation:
      "Kobe wore #8 from 1996-2006, then switched to #24. The Lakers retired both numbers.",
    difficulty: "medium",
    category: "by-the-numbers",
  },
  {
    question: "How many points does a player need to score in their career to be in the '30,000 Point Club'?",
    options: ["25,000", "30,000", "35,000", "40,000"],
    correct_index: 1,
    explanation:
      "Only a handful of players have hit 30,000 career points: Kareem, Karl Malone, LeBron, Kobe, Jordan, Dirk.",
    difficulty: "medium",
    category: "by-the-numbers",
  },
  {
    question: "What jersey number did Larry Bird wear for the Celtics?",
    options: ["23", "33", "32", "34"],
    correct_index: 1,
    explanation: "Bird's #33 hangs in the rafters in Boston, retired forever.",
    difficulty: "hard",
    category: "by-the-numbers",
  },
  {
    question: "What jersey number did Bill Russell wear that the entire NBA retired league-wide in 2022?",
    options: ["6", "23", "11", "33"],
    correct_index: 0,
    explanation:
      "The NBA retired #6 across all 30 teams to honor Russell, who won 11 championships with the Celtics.",
    difficulty: "extreme",
    category: "by-the-numbers",
  },

  // ===== MYSTERY PLAYER =====
  {
    question: "This player is 6'8\", from Akron, Ohio, and has won championships with three different teams. Who is it?",
    options: ["Kevin Durant", "LeBron James", "Kawhi Leonard", "Carmelo Anthony"],
    correct_index: 1,
    explanation:
      "LeBron won with Miami, Cleveland, and the Lakers — the only player ever to win Finals MVP with three different franchises.",
    difficulty: "easy",
    category: "mystery-player",
  },
  {
    question: "This guard wore #3, won championships in Miami, and was nicknamed 'Flash.' Who is it?",
    options: ["Allen Iverson", "Stephen Curry", "Dwyane Wade", "Chris Paul"],
    correct_index: 2,
    explanation:
      "Wade played his entire career mostly with the Heat and won three championships in Miami.",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "This 7-foot center from Serbia has won multiple MVPs in Denver. Who is it?",
    options: ["Joel Embiid", "Nikola Jokić", "Luka Dončić", "Kristaps Porziņģis"],
    correct_index: 1,
    explanation:
      "Jokić, 'The Joker,' won back-to-back MVPs in 2021 and 2022, another in 2024, then a championship.",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "This player won the 1984 MVP, the 1984 Finals MVP, and was nicknamed 'Larry Legend.' Who is it?",
    options: ["Larry Bird", "Magic Johnson", "Julius Erving", "Moses Malone"],
    correct_index: 0,
    explanation:
      "Bird's 1983-84 season was his peak — MVP, Finals MVP, and a championship. He won three straight MVPs from '84 to '86.",
    difficulty: "hard",
    category: "mystery-player",
  },
  {
    question: "This guard played for the Pistons in the late 1980s, won two championships, and was nicknamed 'Zeke.' Who is it?",
    options: ["Joe Dumars", "Dennis Rodman", "Isiah Thomas", "Vinnie Johnson"],
    correct_index: 2,
    explanation:
      "Isiah led the 'Bad Boys' Pistons to back-to-back championships in 1989 and 1990.",
    difficulty: "extreme",
    category: "mystery-player",
  },

  // ===== WHERE'D HE PLAY =====
  {
    question: "Which of these teams did Michael Jordan NOT play for?",
    options: ["Chicago Bulls", "Washington Wizards", "Boston Celtics", "Detroit Pistons"],
    correct_index: 2,
    explanation:
      "Jordan played for the Bulls (1984-1998) and finished with the Wizards (2001-2003). Never played for the Celtics or Pistons.",
    difficulty: "easy",
    category: "wherehe-played",
  },
  {
    question: "Which team did Kevin Durant start his NBA career with?",
    options: [
      "Oklahoma City Thunder",
      "Seattle SuperSonics",
      "Golden State Warriors",
      "Brooklyn Nets",
    ],
    correct_index: 1,
    explanation:
      "KD was drafted by the Sonics in 2007. They became the OKC Thunder the next year when the franchise moved.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Allen Iverson spend the bulk of his career?",
    options: ["Detroit Pistons", "Philadelphia 76ers", "Denver Nuggets", "Memphis Grizzlies"],
    correct_index: 1,
    explanation:
      "AI was a Sixer for over 10 seasons. He had brief stops in Denver, Detroit, and Memphis later in his career.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Which team did Shaquille O'Neal NOT win a championship with?",
    options: ["Los Angeles Lakers", "Miami Heat", "Boston Celtics", "Phoenix Suns"],
    correct_index: 2,
    explanation:
      "Shaq won three rings with the Lakers and one with the Heat. He played for the Celtics late but didn't win there.",
    difficulty: "hard",
    category: "wherehe-played",
  },
  {
    question: "Which sequence of teams did Wilt Chamberlain play for?",
    options: [
      "Warriors → 76ers → Lakers",
      "Knicks → Celtics → Lakers",
      "Bulls → Knicks → 76ers",
      "Lakers only",
    ],
    correct_index: 0,
    explanation:
      "Wilt started with the Warriors (Philadelphia, then San Francisco), went back to Philly with the 76ers, finished with the Lakers.",
    difficulty: "extreme",
    category: "wherehe-played",
  },

  // ===== FRANCHISE =====
  {
    question: "What city are the Lakers based in?",
    options: ["Los Angeles", "Las Vegas", "Long Beach", "Lakeland"],
    correct_index: 0,
    explanation:
      "The Lakers moved from Minneapolis to Los Angeles in 1960. They kept the 'Lakers' name even though LA isn't known for lakes.",
    difficulty: "easy",
    category: "franchise",
  },
  {
    question: "What was the original name of the franchise now known as the Sacramento Kings?",
    options: [
      "Cincinnati Royals",
      "Kansas City Kings",
      "Rochester Royals",
      "All of these",
    ],
    correct_index: 3,
    explanation:
      "The Kings franchise has been Rochester Royals, Cincinnati Royals, Kansas City Kings, and Sacramento Kings. Long history of moves.",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "The Oklahoma City Thunder were originally based in which city?",
    options: ["Memphis", "Vancouver", "Seattle", "New Orleans"],
    correct_index: 2,
    explanation:
      "The Seattle SuperSonics moved to OKC in 2008 and rebranded as the Thunder. Seattle fans are still mad.",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "In what year did the NBA officially form (originally as the BAA)?",
    options: ["1936", "1946", "1956", "1966"],
    correct_index: 1,
    explanation:
      "The Basketball Association of America started in 1946 and merged with the National Basketball League in 1949 to become the NBA.",
    difficulty: "hard",
    category: "franchise",
  },
  {
    question: "What was the original name of the Atlanta Hawks franchise?",
    options: [
      "Tri-Cities Blackhawks",
      "Milwaukee Hawks",
      "St. Louis Hawks",
      "Atlanta Falcons",
    ],
    correct_index: 0,
    explanation:
      "The franchise started as the Tri-Cities Blackhawks in 1946 (covering parts of Iowa and Illinois), then moved to Milwaukee, St. Louis, and finally Atlanta.",
    difficulty: "extreme",
    category: "franchise",
  },

  // ===== THE HALL =====
  {
    question: "Who is widely considered the GOAT (Greatest of All Time) by most NBA fans?",
    options: ["LeBron James", "Michael Jordan", "Kareem Abdul-Jabbar", "Kobe Bryant"],
    correct_index: 1,
    explanation:
      "The GOAT debate between MJ and LeBron is real, but in most fan polls Jordan still wins. Especially older fans.",
    difficulty: "easy",
    category: "the-hall",
  },
  {
    question: "What decade did Magic Johnson and Larry Bird's rivalry dominate the NBA?",
    options: ["1970s", "1980s", "1990s", "2000s"],
    correct_index: 1,
    explanation:
      "Magic and Bird's NBA careers ran from 1979 to the early '90s, but the '80s were peak Lakers vs. Celtics rivalry.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "Who is known as 'The Big Dipper'?",
    options: ["Bill Russell", "Kareem Abdul-Jabbar", "Wilt Chamberlain", "Shaquille O'Neal"],
    correct_index: 2,
    explanation:
      "'The Big Dipper' was one of Wilt's many nicknames. He had the most wild stat lines in NBA history.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "Who was nicknamed 'The Mailman' because 'he always delivers'?",
    options: ["John Stockton", "Karl Malone", "David Robinson", "Patrick Ewing"],
    correct_index: 1,
    explanation:
      "Malone played 19 seasons, mostly with the Utah Jazz. Stockton was his point guard the whole time. Hall of Famers both.",
    difficulty: "hard",
    category: "the-hall",
  },
  {
    question: "Who was George Mikan?",
    options: [
      "First dominant big man in NBA history",
      "NBA referee",
      "First commissioner of the NBA",
      "First Black player in the NBA",
    ],
    correct_index: 0,
    explanation:
      "Mikan dominated the late 1940s and early 1950s with the Minneapolis Lakers, winning 5 championships. He's why the lane was widened — to make it fair.",
    difficulty: "extreme",
    category: "the-hall",
  },

  // ===== HARDWARE =====
  {
    question: "What does 'MVP' stand for in basketball?",
    options: [
      "Most Valuable Player",
      "Master Valuable Performer",
      "Most Versatile Player",
      "Most Vital Pro",
    ],
    correct_index: 0,
    explanation:
      "MVP. Voted on by sportswriters and broadcasters. The most prestigious individual award in the league.",
    difficulty: "easy",
    category: "hardware",
  },
  {
    question: "Which player has won the most regular-season MVP awards?",
    options: [
      "Michael Jordan (5)",
      "LeBron James (4)",
      "Kareem Abdul-Jabbar (6)",
      "Bill Russell (5)",
    ],
    correct_index: 2,
    explanation:
      "Kareem has 6 MVPs. Russell, Jordan, and LeBron are tied for second with 5. Wilt has 4.",
    difficulty: "medium",
    category: "hardware",
  },
  {
    question: "What does 'DPOY' stand for?",
    options: [
      "Defensive Player of the Year",
      "Draft Player of the Year",
      "Dunk Player of the Year",
      "Decisive Player of the Year",
    ],
    correct_index: 0,
    explanation:
      "The DPOY award goes to the best defender in the league. First given out in 1982-83. Players like Dikembe Mutombo, Ben Wallace, and Rudy Gobert have won multiple times.",
    difficulty: "medium",
    category: "hardware",
  },
  {
    question: "Who won the Finals MVP in 2014 when the Spurs beat the Heat?",
    options: ["Tim Duncan", "Tony Parker", "Manu Ginóbili", "Kawhi Leonard"],
    correct_index: 3,
    explanation:
      "Kawhi won Finals MVP at 22 years old, becoming the youngest Finals MVP since Magic Johnson in 1980.",
    difficulty: "hard",
    category: "hardware",
  },
  {
    question:
      "Who is the only player in NBA history to win MVP, Finals MVP, Defensive Player of the Year, and Rookie of the Year?",
    options: ["Kareem Abdul-Jabbar", "Hakeem Olajuwon", "Tim Duncan", "Michael Jordan"],
    correct_index: 1,
    explanation:
      "Hakeem won all four awards in his career: ROY in 1985, DPOY twice (1993, 1994), MVP in 1994, and Finals MVPs in 1994 and 1995.",
    difficulty: "extreme",
    category: "hardware",
  },
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function loadDotEnv() {
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* noop */
  }
}

function difficultyToInt(d: Difficulty): number {
  return ({ easy: 1, medium: 2, hard: 3, extreme: 4 } as const)[d];
}

async function main() {
  // Pre-fetch existing trivia question texts so we can skip duplicates
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "trivia")
    .eq("content_type", "trivia_question");

  const existingTexts = new Set(
    (existing ?? [])
      .map((r) => (r.payload as { question?: string } | null)?.question)
      .filter(Boolean) as string[]
  );

  let added = 0;
  let skipped = 0;
  for (const q of QUESTIONS) {
    if (existingTexts.has(q.question)) {
      skipped++;
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "trivia",
      content_type: "trivia_question",
      payload: q,
      status: "live",
      difficulty: difficultyToInt(q.difficulty),
      created_by_curator: false,
    });
    if (error) {
      console.error(`  ✗ "${q.question.slice(0, 60)}…":`, error.message);
      continue;
    }
    added++;
  }
  console.log(`Done. Added ${added}, skipped ${skipped}, total ${QUESTIONS.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
