/**
 * Seed Kemi's first week of Think Tank puzzles into game_content.
 *
 * Run with: npx tsx scripts/seed-think-tank-week1.ts
 *
 * Idempotent — uses upsert keyed on (game_slug, content_type, payload->>'title').
 * Safe to re-run; existing rows are updated, not duplicated.
 *
 * Requires migration 018_think_tank.sql.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type SingleGridPuzzle = {
  title: string;
  intro: string;
  rows: string[];
  row_label: string;
  cols: string[];
  col_label: string;
  clues: string[];
  solution: Record<string, string>;
  difficulty: "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";
  grid_type: "3x3" | "4x4";
  week_order: number;
};

type DoubleGridPuzzle = {
  title: string;
  intro: string;
  rows: string[];
  row_label: string;
  cols_a: string[];
  col_a_label: string;
  cols_b: string[];
  col_b_label: string;
  clues: string[];
  solution: Record<string, { bag: string; stuffy: string }>;
  difficulty: "hard";
  grid_type: "3x3-double";
  week_order: number;
};

type Puzzle = SingleGridPuzzle | DoubleGridPuzzle;

const PUZZLES: Puzzle[] = [
  {
    week_order: 1,
    title: "Three Friends, Three Lunches",
    intro:
      "Sam, Ava, and Maya each brought a different lunch to school today. One brought pizza, one brought a sandwich, and one brought sushi.",
    rows: ["Sam", "Ava", "Maya"],
    row_label: "Friend",
    cols: ["pizza", "sandwich", "sushi"],
    col_label: "Lunch",
    clues: ["Sam did NOT bring pizza.", "Maya brought sushi."],
    solution: { Sam: "sandwich", Ava: "pizza", Maya: "sushi" },
    difficulty: "easy",
    grid_type: "3x3",
  },
  {
    week_order: 2,
    title: "The Pet Parade",
    intro:
      "Three kids each have a different pet. The pets are a cat, a dog, and a fish.",
    rows: ["Lily", "Tomas", "Ben"],
    row_label: "Friend",
    cols: ["cat", "dog", "fish"],
    col_label: "Pet",
    clues: [
      "Lily does NOT have the fish.",
      "Tomas has a pet that swims.",
      "Ben does NOT have the cat.",
    ],
    solution: { Lily: "cat", Tomas: "fish", Ben: "dog" },
    difficulty: "easy-medium",
    grid_type: "3x3",
  },
  {
    week_order: 3,
    title: "Favorite Colors",
    intro:
      "Three sisters each love a different color. Their favorite colors are pink, green, and yellow.",
    rows: ["Mia", "Zoe", "Ruby"],
    row_label: "Sister",
    cols: ["pink", "green", "yellow"],
    col_label: "Color",
    clues: [
      "Mia's favorite is not yellow.",
      "Zoe's favorite is the color of grass.",
      "Ruby's favorite is the color of the sun.",
    ],
    solution: { Mia: "pink", Zoe: "green", Ruby: "yellow" },
    difficulty: "medium",
    grid_type: "3x3",
  },
  {
    week_order: 4,
    title: "Four Birthday Months",
    intro:
      "Four cousins each have a birthday in a different month: April, July, October, and December.",
    rows: ["Ada", "Liam", "Theo", "Nora"],
    row_label: "Cousin",
    cols: ["April", "July", "October", "December"],
    col_label: "Month",
    clues: [
      "Ada's birthday is in the spring.",
      "Nora's birthday is the last month of the year.",
      "Theo's birthday is in the fall.",
      "Liam's birthday is in the summer.",
    ],
    solution: {
      Ada: "April",
      Liam: "July",
      Theo: "October",
      Nora: "December",
    },
    difficulty: "medium-hard",
    grid_type: "4x4",
  },
  {
    week_order: 5,
    title: "The Sleepover",
    intro:
      "Three friends are having a sleepover. Each has a different sleeping bag and brought a different stuffed animal.",
    rows: ["Cleo", "Beau", "Iris"],
    row_label: "Friend",
    cols_a: ["purple bag", "pink bag", "rainbow bag"],
    col_a_label: "Sleeping bag",
    cols_b: ["unicorn", "panda", "bunny"],
    col_b_label: "Stuffy",
    clues: [
      "Cleo did NOT bring the unicorn.",
      "The friend with the pink sleeping bag brought the bunny.",
      "Beau has the rainbow sleeping bag.",
      "Iris brought the unicorn.",
    ],
    solution: {
      Cleo: { bag: "pink bag", stuffy: "bunny" },
      Beau: { bag: "rainbow bag", stuffy: "panda" },
      Iris: { bag: "purple bag", stuffy: "unicorn" },
    },
    difficulty: "hard",
    grid_type: "3x3-double",
  },
];

// Sanity-check each solution against the clues at seed time. Bad data dies
// here, not in front of Kemi.
function verifySolutions() {
  for (const p of PUZZLES) {
    if (p.grid_type === "3x3-double") {
      // Each row has both a bag and a stuffy
      const bags = new Set<string>();
      const stuffies = new Set<string>();
      for (const row of p.rows) {
        const sol = p.solution[row];
        if (!sol) throw new Error(`[${p.title}] missing solution for ${row}`);
        if (!p.cols_a.includes(sol.bag)) throw new Error(`[${p.title}] ${row} bag not in cols_a`);
        if (!p.cols_b.includes(sol.stuffy)) throw new Error(`[${p.title}] ${row} stuffy not in cols_b`);
        bags.add(sol.bag);
        stuffies.add(sol.stuffy);
      }
      if (bags.size !== p.cols_a.length || stuffies.size !== p.cols_b.length) {
        throw new Error(`[${p.title}] bags/stuffies are not unique per row`);
      }
    } else {
      const used = new Set<string>();
      for (const row of p.rows) {
        const sol = p.solution[row];
        if (!sol) throw new Error(`[${p.title}] missing solution for ${row}`);
        if (!p.cols.includes(sol)) throw new Error(`[${p.title}] ${row}=${sol} not in cols`);
        if (used.has(sol)) throw new Error(`[${p.title}] ${sol} assigned twice`);
        used.add(sol);
      }
      if (used.size !== p.cols.length) {
        throw new Error(`[${p.title}] solution doesn't cover every column`);
      }
    }
  }
  console.log(`✓ Verified ${PUZZLES.length} puzzle solutions are well-formed`);
}

async function seed() {
  verifySolutions();

  for (const puzzle of PUZZLES) {
    // Look up by (game_slug, content_type, title) — game_content has no
    // unique constraint on title so we hand-roll the upsert.
    const { data: existing } = await supa
      .from("game_content")
      .select("id, payload")
      .eq("game_slug", "think-tank")
      .eq("content_type", "think_tank_puzzle")
      .filter("payload->>title", "eq", puzzle.title)
      .maybeSingle();

    if (existing) {
      const { error } = await supa
        .from("game_content")
        .update({
          payload: puzzle as unknown as Record<string, unknown>,
          status: "live",
          verification_status: "verified",
        })
        .eq("id", existing.id);
      if (error) throw error;
      console.log(`  ↻ updated  ${puzzle.title} (${existing.id})`);
    } else {
      const { data, error } = await supa
        .from("game_content")
        .insert({
          game_slug: "think-tank",
          content_type: "think_tank_puzzle",
          payload: puzzle as unknown as Record<string, unknown>,
          status: "live",
          verification_status: "verified",
        })
        .select("id")
        .single();
      if (error) throw error;
      console.log(`  + inserted ${puzzle.title} (${data.id})`);
    }
  }

  console.log(`\nDone. ${PUZZLES.length} Think Tank puzzles seeded.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

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
      if (!m) continue;
      const value = m[2].replace(/^"(.*)"$/, "$1");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* fine — env may already be populated */
  }
}
