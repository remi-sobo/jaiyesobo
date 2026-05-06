/**
 * Drop a grammar lesson onto Jaiye's day as a rollover assignment.
 *
 *   npx tsx scripts/add-grammar-lesson.ts grammar-nouns
 *   npx tsx scripts/add-grammar-lesson.ts grammar-nouns 2026-05-06
 *
 * Defaults:
 *   - Date: today (in the server's local time)
 *   - Rollover: TRUE  → if Jaiye doesn't get to it, the task auto-bumps to
 *     tomorrow when he next opens /me. (See lib/rollover.ts.)
 *
 * Idempotent: if a rollover task for this slug already exists with no active
 * completion, the script touches nothing — that pending task will keep
 * floating forward by itself.
 *
 * To register a new lesson:
 *   1. Add a TSX file in /lessons (e.g. grammar-verbs.tsx)
 *   2. Register the slug in lib/lessons.ts
 *   3. Run this script with the new slug
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Lightweight metadata — keeps the script self-contained without importing
// the full app's lesson registry (which pulls in React, Next.js, etc).
const GRAMMAR_LESSONS: Record<string, { title: string; description: string; estimatedMinutes: number }> = {
  "grammar-nouns": {
    title: "Grammar — Nouns: The Names of Everything on the Court",
    description:
      "MCT-style grammar lesson. Read the four parts, do the three exercises, and write at least two writing-prompt answers. About 30 minutes.",
    estimatedMinutes: 30,
  },
  // Add new entries as new lessons get built. Keep slugs in sync with lib/lessons.ts.
};

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
      let val = m[2];
      // Strip wrapping single or double quotes — Next.js's loader does this,
      // and the repo's .env.local uses quoted values.
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* fine */
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const slug = process.argv[2];
  const dateArg = process.argv[3];
  if (!slug) {
    console.error(
      "Usage: npx tsx scripts/add-grammar-lesson.ts <slug> [YYYY-MM-DD]\n" +
        "Available slugs: " +
        Object.keys(GRAMMAR_LESSONS).join(", ")
    );
    process.exit(1);
  }
  const meta = GRAMMAR_LESSONS[slug];
  if (!meta) {
    console.error(`Unknown grammar slug: ${slug}`);
    console.error("Add it to GRAMMAR_LESSONS in this script and lib/lessons.ts.");
    process.exit(1);
  }

  const date = dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg) ? dateArg : todayIso();

  const { data: jaiye, error: uErr } = await supa
    .from("users")
    .select("id, display_name")
    .eq("role", "kid")
    .eq("display_name", "Jaiye")
    .maybeSingle();
  if (uErr) throw uErr;
  if (!jaiye) throw new Error("No Jaiye user. Run npx tsx scripts/seed.ts first.");

  // Look for any existing task with this slug for Jaiye that hasn't been
  // completed yet. If we find one, leave it — rollover will bump it forward.
  const { data: existing } = await supa
    .from("tasks")
    .select("id, date, completions(id, deleted_at)")
    .eq("user_id", jaiye.id)
    .eq("lesson_slug", slug);

  type Row = {
    id: string;
    date: string;
    completions: { id: string; deleted_at: string | null }[] | null;
  };

  const openOne = ((existing ?? []) as Row[]).find(
    (t) => !(t.completions ?? []).some((c) => !c.deleted_at)
  );
  if (openOne) {
    console.log(
      `  ✓ ${slug} is already on Jaiye's queue (task ${openOne.id}, currently dated ${openOne.date}). Rollover keeps it floating — nothing to do.`
    );
    return;
  }

  const { data, error } = await supa
    .from("tasks")
    .insert({
      user_id: jaiye.id,
      date,
      title: meta.title,
      description: meta.description,
      type: "homeschool",
      subject: "English",
      completion_type: "lesson",
      lesson_slug: slug,
      requires_photo: false,
      estimated_minutes: meta.estimatedMinutes,
      rollover: true,
      sort_order: 100,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
  console.log(
    `  ✓ Added ${slug} for Jaiye on ${date} (task ${data.id}). Rollover ON — it'll keep showing up until he finishes it.`
  );
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
