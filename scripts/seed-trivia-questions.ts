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

  // ============================================================
  // ROUND 2 — 80 more questions added per Jaiye's request
  // (he flagged some old answers as wrong — these are vetted)
  // ============================================================

  // ===== THE BOOKS (records / stats) =====
  {
    question: "Who is the all-time leader in NBA assists?",
    options: ["Magic Johnson", "Chris Paul", "John Stockton", "Jason Kidd"],
    correct_index: 2,
    explanation:
      "Stockton has 15,806 career assists — over 3,000 more than second place. He's the all-time leader in BOTH assists and steals.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who is the all-time leader in NBA blocks?",
    options: ["Dikembe Mutombo", "Mark Eaton", "Hakeem Olajuwon", "Tim Duncan"],
    correct_index: 2,
    explanation: "Hakeem Olajuwon — 3,830 career blocks. He led the league in blocks three times.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who is the all-time leader in NBA steals?",
    options: ["Allen Iverson", "Gary Payton", "Michael Jordan", "John Stockton"],
    correct_index: 3,
    explanation: "John Stockton again — 3,265 steals. The Jazz point guard owns both the steals AND assists records.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who has the most career playoff points in NBA history?",
    options: ["LeBron James", "Michael Jordan", "Kareem Abdul-Jabbar", "Kobe Bryant"],
    correct_index: 0,
    explanation: "LeBron passed Michael Jordan in 2017 and just kept going. He has well over 8,000 playoff points.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who scored 14 three-pointers in a single NBA game (a record)?",
    options: ["Stephen Curry", "Klay Thompson", "Damian Lillard", "Ray Allen"],
    correct_index: 1,
    explanation: "Klay dropped 14 threes against the Bulls in October 2018. Caught fire in the third quarter.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Who scored 81 points in a single NBA game?",
    options: ["Kobe Bryant", "Wilt Chamberlain", "David Thompson", "Michael Jordan"],
    correct_index: 0,
    explanation: "Kobe vs the Raptors, January 22, 2006. Second-highest in NBA history behind Wilt's 100.",
    difficulty: "easy",
    category: "the-books",
  },
  {
    question: "Who scored 70 points against the Boston Celtics in 2017?",
    options: ["James Harden", "Devin Booker", "Damian Lillard", "Bradley Beal"],
    correct_index: 1,
    explanation: "Devin Booker dropped 70 at TD Garden. He was 20 years old. Suns lost anyway.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Who recorded the most recent quadruple-double in NBA history?",
    options: ["Nate Thurmond", "Hakeem Olajuwon", "David Robinson", "Alvin Robertson"],
    correct_index: 2,
    explanation: "David Robinson on Feb 17, 1994 (34 pts, 10 reb, 10 ast, 10 blk). Only four quadruple-doubles have ever been recorded.",
    difficulty: "extreme",
    category: "the-books",
  },
  {
    question: "Who holds the NBA single-game playoff scoring record?",
    options: ["Wilt Chamberlain", "Michael Jordan", "Elgin Baylor", "Kobe Bryant"],
    correct_index: 1,
    explanation:
      "MJ scored 63 vs the Celtics in 1986 — they lost in double OT. Larry Bird called him 'God disguised as Michael Jordan' afterward.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "How many seasons did Vince Carter play in the NBA?",
    options: ["18", "20", "22", "24"],
    correct_index: 2,
    explanation: "22 seasons — the longest career in NBA history. Drafted in 1998, retired in 2020.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Who held the all-time 3-point made record before Stephen Curry broke it?",
    options: ["Reggie Miller", "Ray Allen", "Kyle Korver", "Steve Nash"],
    correct_index: 1,
    explanation:
      "Ray Allen finished with 2,973 threes. Curry passed him in December 2021 and is now well past 3,800.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Which team did Wilt Chamberlain score 100 against?",
    options: ["Boston Celtics", "Los Angeles Lakers", "New York Knicks", "St. Louis Hawks"],
    correct_index: 2,
    explanation: "March 2, 1962 — Philadelphia Warriors 169, New York Knicks 147. There's no video footage of the game.",
    difficulty: "medium",
    category: "the-books",
  },
  {
    question: "Who has the most career triple-doubles in NBA history?",
    options: ["Magic Johnson", "Oscar Robertson", "Russell Westbrook", "Nikola Jokić"],
    correct_index: 2,
    explanation: "Westbrook passed Oscar Robertson in 2021. The bar is now well over 200.",
    difficulty: "easy",
    category: "the-books",
  },
  {
    question: "Most consecutive games scoring 50 or more points (an NBA record)?",
    options: ["3", "5", "7", "9"],
    correct_index: 2,
    explanation: "Wilt Chamberlain — 7 straight 50-point games in December 1961. Untouchable.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Who is the active NBA leader in career 3-pointers made?",
    options: ["James Harden", "Damian Lillard", "Klay Thompson", "Stephen Curry"],
    correct_index: 3,
    explanation: "Stephen Curry — and not just active, all-time. He passed Ray Allen in 2021 and never looked back.",
    difficulty: "easy",
    category: "the-books",
  },
  {
    question: "Who scored the first 3-pointer in NBA history?",
    options: ["Larry Bird", "Chris Ford", "Rick Barry", "Pete Maravich"],
    correct_index: 1,
    explanation: "Boston's Chris Ford — October 12, 1979, the very first night the 3-point line existed.",
    difficulty: "extreme",
    category: "the-books",
  },
  {
    question: "Who is the all-time leader in NBA games played?",
    options: ["Robert Parish", "Kareem Abdul-Jabbar", "Vince Carter", "Kevin Garnett"],
    correct_index: 0,
    explanation: "Robert 'The Chief' Parish — 1,611 regular-season games over 21 seasons.",
    difficulty: "hard",
    category: "the-books",
  },
  {
    question: "Which two teams have played each other in the NBA Finals the most times?",
    options: ["Lakers and Bulls", "Lakers and Celtics", "Lakers and Sixers", "Celtics and Pistons"],
    correct_index: 1,
    explanation: "Lakers vs Celtics — 12 Finals matchups. Boston has won 9 of them.",
    difficulty: "medium",
    category: "the-books",
  },

  // ===== THE HALL (lore / iconic moments) =====
  {
    question: "What number did Michael Jordan briefly wear when he came out of retirement in 1995?",
    options: ["12", "23", "45", "9"],
    correct_index: 2,
    explanation: "MJ wore #45 for his first 17 games back. Switched back to #23 partway through the playoffs.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "Who hit the championship-winning shot in Game 7 of the 2016 NBA Finals?",
    options: ["LeBron James", "Kyrie Irving", "Kevin Love", "Stephen Curry"],
    correct_index: 1,
    explanation: "Kyrie's pull-up three over Steph with 53 seconds left clinched Cleveland's first title.",
    difficulty: "easy",
    category: "the-hall",
  },
  {
    question: "Who has won the most NBA championships as a player?",
    options: ["Michael Jordan", "Bill Russell", "Kareem Abdul-Jabbar", "Robert Horry"],
    correct_index: 1,
    explanation: "Bill Russell — 11 rings in 13 seasons with the Celtics. Including 8 in a row from 1959 to 1966.",
    difficulty: "easy",
    category: "the-hall",
  },
  {
    question: "Who did Vince Carter dunk over at the 2000 Olympics ('Le Dunk de la Mort')?",
    options: ["Yao Ming", "Frédéric Weis", "Dirk Nowitzki", "Pau Gasol"],
    correct_index: 1,
    explanation: "Vince leapt clean over France's 7'2'' Frédéric Weis. The French press called it 'the dunk of death.'",
    difficulty: "hard",
    category: "the-hall",
  },
  {
    question: "Who hit 'The Shot' in 1989 over Craig Ehlo to beat Cleveland?",
    options: ["Larry Bird", "Magic Johnson", "Michael Jordan", "Reggie Miller"],
    correct_index: 2,
    explanation: "MJ's series-winning buzzer-beater in the first round, hanging in the air long enough to spawn a million posters.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "What was the nickname for the back-to-back champion 1989-90 Pistons?",
    options: ["The Bad Boys", "The Goon Squad", "The Iron Wall", "The Motor City Crew"],
    correct_index: 0,
    explanation: "Bill Laimbeer, Isiah Thomas, Dennis Rodman — back-to-back champions in '89 and '90.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "Who is the only player to be named Finals MVP six times?",
    options: ["LeBron James", "Bill Russell", "Michael Jordan", "Magic Johnson"],
    correct_index: 2,
    explanation: "MJ went 6-for-6 in the Finals — won every Finals he played, won Finals MVP every time.",
    difficulty: "medium",
    category: "the-hall",
  },
  {
    question: "Where did the Lakers franchise originally play before moving to LA?",
    options: ["Rochester", "Minneapolis", "Cincinnati", "Syracuse"],
    correct_index: 1,
    explanation: "The Minneapolis Lakers — named for Minnesota's lakes. They moved to LA in 1960.",
    difficulty: "easy",
    category: "the-hall",
  },
  {
    question: "Which player is famous for the 'Dream Shake' move?",
    options: ["Hakeem Olajuwon", "Tim Duncan", "Kevin Garnett", "Charles Barkley"],
    correct_index: 0,
    explanation: "Hakeem's footwork in the post was a thing of art. Two-time champion, two-time Finals MVP.",
    difficulty: "easy",
    category: "the-hall",
  },

  // ===== BY THE NUMBERS (rules) =====
  {
    question: "How many players are on the court for one team at a time?",
    options: ["4", "5", "6", "7"],
    correct_index: 1,
    explanation: "Five — center, two forwards, two guards. Modern lineups don't always look like that.",
    difficulty: "easy",
    category: "by-the-numbers",
  },
  {
    question: "How many minutes is a regulation NBA game (without overtime)?",
    options: ["40", "44", "48", "60"],
    correct_index: 2,
    explanation: "Four 12-minute quarters = 48 minutes total.",
    difficulty: "easy",
    category: "by-the-numbers",
  },
  {
    question: "How many teams are in the NBA?",
    options: ["28", "29", "30", "32"],
    correct_index: 2,
    explanation: "30 teams — 15 in each conference.",
    difficulty: "easy",
    category: "by-the-numbers",
  },
  {
    question: "How many points is a free throw worth?",
    options: ["1", "2", "3", "Half a point"],
    correct_index: 0,
    explanation: "One point. Free throws are unguarded shots from 15 feet.",
    difficulty: "easy",
    category: "by-the-numbers",
  },
  {
    question: "How many seconds does an NBA team have to attempt a shot?",
    options: ["20", "24", "30", "40"],
    correct_index: 1,
    explanation: "The 24-second shot clock — adopted in 1954 to speed the game up. Saved the league.",
    difficulty: "medium",
    category: "by-the-numbers",
  },
  {
    question: "How many feet from the basket is the NBA 3-point line at the top of the arc?",
    options: ["20'9''", "22'2''", "23'9''", "26'0''"],
    correct_index: 2,
    explanation: "23 feet 9 inches at the top, 22 feet at the corners. Curry's range is well past that.",
    difficulty: "medium",
    category: "by-the-numbers",
  },
  {
    question: "How many personal fouls before a player fouls out of an NBA game?",
    options: ["4", "5", "6", "7"],
    correct_index: 2,
    explanation: "Six. Smart players save fouls — bigs especially.",
    difficulty: "easy",
    category: "by-the-numbers",
  },

  // ===== DRAFT-CLASS =====
  {
    question: "Who was selected #1 overall in the 2003 NBA Draft?",
    options: ["Carmelo Anthony", "Dwyane Wade", "LeBron James", "Chris Bosh"],
    correct_index: 2,
    explanation:
      "LeBron, straight out of Akron's St. Vincent–St. Mary's. Carmelo went 3rd, Bosh 4th, Wade 5th — one of the deepest drafts ever.",
    difficulty: "easy",
    category: "draft-class",
  },
  {
    question: "Where was Kobe Bryant selected in the 1996 NBA Draft?",
    options: ["3rd overall", "8th overall", "13th overall", "23rd overall"],
    correct_index: 2,
    explanation: "13th overall by Charlotte — then immediately traded to the Lakers for Vlade Divac.",
    difficulty: "medium",
    category: "draft-class",
  },
  {
    question: "Which player was traded for Kobe Bryant on draft night 1996?",
    options: ["Vlade Divac", "Robert Horry", "Eddie Jones", "Cedric Ceballos"],
    correct_index: 0,
    explanation: "Charlotte drafted Kobe and shipped him to LA for Vlade Divac. Possibly the worst trade ever.",
    difficulty: "hard",
    category: "draft-class",
  },
  {
    question: "Who was the first player drafted #1 overall from outside North America?",
    options: ["Dirk Nowitzki", "Andrea Bargnani", "Yao Ming", "Hakeem Olajuwon"],
    correct_index: 2,
    explanation: "Yao Ming, drafted #1 by the Houston Rockets in 2002 — straight from Shanghai.",
    difficulty: "medium",
    category: "draft-class",
  },
  {
    question: "Who was the #1 pick in the 2023 NBA Draft?",
    options: ["Scoot Henderson", "Brandon Miller", "Victor Wembanyama", "Amen Thompson"],
    correct_index: 2,
    explanation: "Wemby to the Spurs. He's 7'4'' and shoots like a guard.",
    difficulty: "easy",
    category: "draft-class",
  },
  {
    question: "Which team drafted Allen Iverson #1 overall in 1996?",
    options: ["Sixers", "Nets", "Wizards", "Raptors"],
    correct_index: 0,
    explanation: "Philadelphia 76ers. Iverson, Marcus Camby, and Shareef Abdur-Rahim went 1-2-3 that year.",
    difficulty: "medium",
    category: "draft-class",
  },
  {
    question: "Where was Larry Bird drafted in 1978 (he didn't play until 1979)?",
    options: ["3rd overall", "6th overall", "10th overall", "1st overall"],
    correct_index: 1,
    explanation:
      "6th overall by Boston. Bird stayed at Indiana State for his senior year. Red Auerbach drafted him anyway and waited a full year — genius move.",
    difficulty: "hard",
    category: "draft-class",
  },

  // ===== FRANCHISE =====
  {
    question: "Which team holds the record for most NBA championships?",
    options: ["Lakers", "Celtics", "Warriors", "Bulls"],
    correct_index: 1,
    explanation: "Boston Celtics — 18 titles. Lakers have 17. Together they've won over a third of all NBA championships.",
    difficulty: "easy",
    category: "franchise",
  },
  {
    question: "What franchise did the Oklahoma City Thunder used to be?",
    options: ["Vancouver Grizzlies", "Charlotte Hornets", "Seattle SuperSonics", "New Jersey Nets"],
    correct_index: 2,
    explanation: "The Sonics played in Seattle from 1967 to 2008. Thunder fans inherited the franchise. Seattle fans inherited a grudge.",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "The Memphis Grizzlies originated in which Canadian city?",
    options: ["Toronto", "Vancouver", "Montreal", "Calgary"],
    correct_index: 1,
    explanation: "Vancouver Grizzlies — 1995 to 2001. Then they moved to Memphis.",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "Where did the Atlanta Hawks franchise originate?",
    options: ["Tri-Cities", "St. Louis", "Buffalo", "Atlanta"],
    correct_index: 0,
    explanation: "The Tri-Cities Blackhawks (1946) — Iowa/Illinois area. Then Milwaukee, then St. Louis, then Atlanta in 1968.",
    difficulty: "hard",
    category: "franchise",
  },
  {
    question: "How many NBA championships have the Spurs won?",
    options: ["3", "4", "5", "6"],
    correct_index: 2,
    explanation: "Five — all under coach Gregg Popovich (1999, 2003, 2005, 2007, 2014).",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "Which league did the Indiana Pacers come from before joining the NBA?",
    options: ["NBL", "ABL", "ABA", "BAA"],
    correct_index: 2,
    explanation: "The Pacers won three ABA titles before the 1976 ABA-NBA merger.",
    difficulty: "hard",
    category: "franchise",
  },
  {
    question: "Where do the Brooklyn Nets play their home games?",
    options: ["Madison Square Garden", "Barclays Center", "TD Garden", "Prudential Center"],
    correct_index: 1,
    explanation: "Barclays Center in Brooklyn since 2012. Before that they were the New Jersey Nets at the Prudential Center.",
    difficulty: "medium",
    category: "franchise",
  },
  {
    question: "Which arena do the New York Knicks call home?",
    options: ["Madison Square Garden", "United Center", "Barclays Center", "TD Garden"],
    correct_index: 0,
    explanation: "Madison Square Garden — 'the world's most famous arena.' The Knicks have played there since 1968.",
    difficulty: "easy",
    category: "franchise",
  },
  {
    question: "Where did the Sacramento Kings franchise originally play?",
    options: ["Buffalo", "Rochester", "Cincinnati", "Kansas City"],
    correct_index: 1,
    explanation: "The Rochester Royals (1946) — then Cincinnati, then Kansas City–Omaha, then Sacramento in 1985.",
    difficulty: "extreme",
    category: "franchise",
  },

  // ===== HARDWARE (awards) =====
  {
    question: "Who won NBA MVP for the 2022-23 season?",
    options: ["Nikola Jokić", "Joel Embiid", "Giannis Antetokounmpo", "Luka Dončić"],
    correct_index: 1,
    explanation: "Embiid — the 76ers' first MVP since Allen Iverson in 2001.",
    difficulty: "medium",
    category: "hardware",
  },
  {
    question: "Who was named Rookie of the Year for the 2023-24 season?",
    options: ["Chet Holmgren", "Brandon Miller", "Victor Wembanyama", "Scoot Henderson"],
    correct_index: 2,
    explanation: "Wemby unanimously. 21/10/3.6 blocks per game as a rookie. Also won Defensive Player of the Year a year later.",
    difficulty: "easy",
    category: "hardware",
  },
  {
    question: "What is the name of the trophy awarded to the NBA champion?",
    options: ["Maurice Podoloff Trophy", "Larry O'Brien Trophy", "Bill Russell Trophy", "Walter Brown Trophy"],
    correct_index: 1,
    explanation: "Larry O'Brien — named after the NBA commissioner who oversaw the ABA-NBA merger.",
    difficulty: "easy",
    category: "hardware",
  },
  {
    question: "The Phoenix Suns' first-ever MVP was?",
    options: ["Steve Nash", "Charles Barkley", "Kevin Johnson", "Walter Davis"],
    correct_index: 1,
    explanation: "Charles Barkley in 1992-93. Nash won two more MVPs later (2005, 2006).",
    difficulty: "hard",
    category: "hardware",
  },
  {
    question: "Who was the first European-born NBA MVP?",
    options: ["Dirk Nowitzki", "Pau Gasol", "Tony Parker", "Manu Ginobili"],
    correct_index: 0,
    explanation: "Dirk Nowitzki — German big man, MVP in 2006-07 with the Mavericks.",
    difficulty: "hard",
    category: "hardware",
  },
  {
    question: "Who won the 2008 NBA Slam Dunk Contest in a Superman cape?",
    options: ["Nate Robinson", "Dwight Howard", "Vince Carter", "Gerald Green"],
    correct_index: 1,
    explanation: "Dwight Howard, in a full Superman cape with 'S' logo. Highest-rated dunk contest in years.",
    difficulty: "medium",
    category: "hardware",
  },
  {
    question: "Which year did Steve Nash win his first MVP?",
    options: ["2003", "2004", "2005", "2006"],
    correct_index: 2,
    explanation: "Nash won back-to-back MVPs in 2005 and 2006. Suns 7-seconds-or-less era was electric.",
    difficulty: "medium",
    category: "hardware",
  },

  // ===== MYSTERY-PLAYER (nicknames) =====
  {
    question: "Who is 'King James'?",
    options: ["Kobe Bryant", "LeBron James", "Kevin Durant", "James Harden"],
    correct_index: 1,
    explanation: "LeBron James, born in Akron — the King's been the face of the league for two decades.",
    difficulty: "easy",
    category: "mystery-player",
  },
  {
    question: "Who is 'The Black Mamba'?",
    options: ["Tracy McGrady", "Kobe Bryant", "Vince Carter", "Allen Iverson"],
    correct_index: 1,
    explanation: "Kobe gave himself the nickname during a rough patch in 2003. Said it was about being focused and lethal.",
    difficulty: "easy",
    category: "mystery-player",
  },
  {
    question: "Who is 'The Greek Freak'?",
    options: ["Goran Dragić", "Toni Kukoč", "Giannis Antetokounmpo", "Vassilis Spanoulis"],
    correct_index: 2,
    explanation: "Giannis — Greek-Nigerian forward who came in raw, became a 2x MVP and 2021 champion.",
    difficulty: "easy",
    category: "mystery-player",
  },
  {
    question: "Who is 'The Logo' — the silhouette on the NBA's actual logo?",
    options: ["Jerry West", "Bob Cousy", "Bill Russell", "Wilt Chamberlain"],
    correct_index: 0,
    explanation: "Jerry West. The NBA has never officially confirmed it but everyone knows.",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "Who is 'The Worm'?",
    options: ["Bill Laimbeer", "Dennis Rodman", "Charles Barkley", "Karl Malone"],
    correct_index: 1,
    explanation: "Dennis Rodman — 5x champion, defensive menace, hair-color rotation specialist.",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "Who is 'Penny'?",
    options: ["Anfernee Hardaway", "Tracy McGrady", "Grant Hill", "Allen Iverson"],
    correct_index: 0,
    explanation: "Anfernee 'Penny' Hardaway. Magic point guard, paired with Shaq in the mid-90s.",
    difficulty: "hard",
    category: "mystery-player",
  },
  {
    question: "Who is 'Boogie'?",
    options: ["Tyreke Evans", "DeMarcus Cousins", "Russell Westbrook", "Nick Young"],
    correct_index: 1,
    explanation: "DeMarcus Cousins — Kentucky big man, four-time All-Star.",
    difficulty: "hard",
    category: "mystery-player",
  },
  {
    question: "Who is 'The Truth'?",
    options: ["Paul Pierce", "Ray Allen", "Kevin Garnett", "Rajon Rondo"],
    correct_index: 0,
    explanation: "Paul Pierce — Shaq actually gave him the nickname after a 42-point game. 'Tell the truth, my boy is the truth.'",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "Who is 'Dr. J'?",
    options: ["Julius Erving", "James Worthy", "Jerry West", "John Havlicek"],
    correct_index: 0,
    explanation: "Julius Erving — ABA legend turned NBA champ with the 76ers in 1983.",
    difficulty: "medium",
    category: "mystery-player",
  },
  {
    question: "Who is 'Iceman'?",
    options: ["George Gervin", "Reggie Miller", "Kobe Bryant", "Jamal Crawford"],
    correct_index: 0,
    explanation: "George Gervin — Spurs legend. Smooth as ice. Four scoring titles.",
    difficulty: "hard",
    category: "mystery-player",
  },

  // ===== WHEREHE-PLAYED (college) =====
  {
    question: "Where did Michael Jordan play college basketball?",
    options: ["Duke", "North Carolina", "Indiana", "Kentucky"],
    correct_index: 1,
    explanation: "UNC — and he hit the title-winning shot as a freshman in 1982.",
    difficulty: "easy",
    category: "wherehe-played",
  },
  {
    question: "Where did Stephen Curry play college basketball?",
    options: ["Duke", "Davidson", "Wake Forest", "North Carolina"],
    correct_index: 1,
    explanation: "Davidson, a small school. Took them to the Elite Eight in 2008. Pros sleep on small-school guards.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Larry Bird play college basketball?",
    options: ["Indiana", "Indiana State", "Illinois State", "Kentucky"],
    correct_index: 1,
    explanation: "Indiana State. Lost the 1979 title game to Magic Johnson's Michigan State — most-watched college basketball game ever.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Magic Johnson play college basketball?",
    options: ["Michigan", "Michigan State", "Ohio State", "Indiana"],
    correct_index: 1,
    explanation: "Michigan State — won the 1979 NCAA championship as a sophomore over Larry Bird.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Tim Duncan play college basketball?",
    options: ["Duke", "North Carolina", "Wake Forest", "Maryland"],
    correct_index: 2,
    explanation: "Wake Forest. Stayed all four years, which was rare for a future #1 pick.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Shaquille O'Neal play college basketball?",
    options: ["Florida", "LSU", "Georgetown", "UCLA"],
    correct_index: 1,
    explanation: "LSU. Two-time SEC Player of the Year. Skipped his senior year and went #1 to the Magic.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Kawhi Leonard play college basketball?",
    options: ["UCLA", "Arizona", "San Diego State", "Stanford"],
    correct_index: 2,
    explanation: "San Diego State. Two seasons, then drafted 15th in 2011 by Indiana, traded to San Antonio.",
    difficulty: "hard",
    category: "wherehe-played",
  },
  {
    question: "Where did Kareem Abdul-Jabbar (then Lew Alcindor) play college?",
    options: ["UCLA", "USC", "Stanford", "California"],
    correct_index: 0,
    explanation: "UCLA under coach John Wooden. Won three straight NCAA titles, then changed his name and went to the NBA.",
    difficulty: "easy",
    category: "wherehe-played",
  },
  {
    question: "Where did Patrick Ewing play college basketball?",
    options: ["Syracuse", "Georgetown", "Villanova", "Duke"],
    correct_index: 1,
    explanation: "Georgetown under John Thompson. Won the 1984 NCAA title.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Kevin Durant play college basketball?",
    options: ["UCLA", "Kansas", "Texas", "Memphis"],
    correct_index: 2,
    explanation: "Texas. One season — averaged 26 and 11, won every freshman award. Drafted 2nd in 2007 (behind Greg Oden).",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Where did Anthony Davis play college basketball?",
    options: ["Duke", "Kentucky", "North Carolina", "Florida"],
    correct_index: 1,
    explanation: "Kentucky under John Calipari. Won the 2012 NCAA title and was the #1 pick that summer.",
    difficulty: "medium",
    category: "wherehe-played",
  },
  {
    question: "Steve Nash won both his MVPs as a member of which team?",
    options: ["Mavericks", "Suns", "Lakers", "Raptors"],
    correct_index: 1,
    explanation: "Phoenix Suns. He played in Dallas before that and LA after — but the MVPs were both in Phoenix (2005, 2006).",
    difficulty: "medium",
    category: "wherehe-played",
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
