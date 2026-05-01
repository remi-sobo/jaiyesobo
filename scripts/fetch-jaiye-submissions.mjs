import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local
try {
  const txt = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: tasks } = await supa
  .from("tasks")
  .select("id, lesson_slug")
  .eq("lesson_slug", "games-curator-onboarding");

console.log("Tasks for games-curator-onboarding:", tasks?.length ?? 0);

if (!tasks?.length) {
  console.log("No tasks found.");
  process.exit(0);
}

const taskIds = tasks.map(t => t.id);

const { data: comps } = await supa
  .from("completions")
  .select("task_id, lesson_responses, completed_at")
  .in("task_id", taskIds)
  .order("completed_at", { ascending: false });

console.log(`\nFound ${comps?.length ?? 0} completion(s):\n`);
for (const c of comps ?? []) {
  console.log("=== Completed at:", c.completed_at, "===");
  console.log(JSON.stringify(c.lesson_responses, null, 2));
  console.log();
}
