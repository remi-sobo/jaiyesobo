/**
 * Bulk-import every JSON file in data/draft-players-pending/ into the DB,
 * inserting players directly as 'verified'. Idempotent: existing names
 * (case-insensitive) for the same team are skipped.
 *
 * Run:
 *   npx tsx scripts/bulk-import-draft-players.ts          # imports as VERIFIED
 *   npx tsx scripts/bulk-import-draft-players.ts --pending # imports as PENDING (review later)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { validatePlayerArray } from "@/lib/draft-validate";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PENDING_DIR = resolve(process.cwd(), "data", "draft-players-pending");

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

type ImportResult =
  | { kind: "fail"; slug: string; error: string }
  | { kind: "ok"; slug: string; inserted: number; skipped: number; errors: string[] };

async function importTeam(
  slug: string,
  jsonPath: string,
  status: "verified" | "pending"
): Promise<ImportResult> {
  const raw = readFileSync(jsonPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { kind: "fail", slug, error: `JSON parse failed: ${String(err)}` };
  }
  const validation = validatePlayerArray(parsed);
  if (!validation.ok) {
    return {
      kind: "fail",
      slug,
      error: `validation: ${validation.errors.slice(0, 3).join(" | ")}` +
        (validation.errors.length > 3 ? ` (+${validation.errors.length - 3} more)` : ""),
    };
  }

  // Confirm team exists
  const { data: team } = await supa
    .from("game_content")
    .select("id")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team")
    .eq("draft_team_slug", slug)
    .maybeSingle();
  if (!team) return { kind: "fail", slug, error: "team_not_found in DB" };

  // Pre-fetch existing player names for idempotency
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player")
    .eq("draft_team_slug", slug);
  const existingNames = new Set(
    (existing ?? [])
      .map((r) => (r as { payload: { name?: string } }).payload?.name)
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.toLowerCase().trim())
  );

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const player of validation.players) {
    const k = player.name.toLowerCase().trim();
    if (existingNames.has(k)) {
      skipped++;
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "draft",
      content_type: "draft_player",
      draft_team_slug: slug,
      payload: player,
      status: "live",
      verification_status: status,
      created_by_curator: false,
    });
    if (error) {
      errors.push(`${player.name}: ${error.message}`);
      continue;
    }
    existingNames.add(k);
    inserted++;
  }

  return { kind: "ok", slug, inserted, skipped, errors };
}

async function main() {
  const verifyImmediately = !process.argv.includes("--pending");
  const status: "verified" | "pending" = verifyImmediately ? "verified" : "pending";

  if (!existsSync(PENDING_DIR)) {
    console.error(`Pending dir does not exist: ${PENDING_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(PENDING_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No JSON files found in ${PENDING_DIR}`);
    process.exit(1);
  }

  console.log(
    `Importing ${files.length} team file${files.length === 1 ? "" : "s"} ` +
      `as ${status.toUpperCase()}…\n`
  );

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const failures: { slug: string; error: string }[] = [];

  for (const f of files) {
    const slug = basename(f, ".json");
    const result = await importTeam(slug, resolve(PENDING_DIR, f), status);
    if (result.kind === "fail") {
      console.log(`  ✗ ${slug.padEnd(12)} ${result.error}`);
      failures.push({ slug, error: result.error });
      continue;
    }
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    totalErrors += result.errors.length;
    const tag = result.errors.length > 0 ? `  ⚠︎ ${result.errors.length} row errors` : "";
    console.log(
      `  ✓ ${slug.padEnd(12)} +${result.inserted} inserted, ${result.skipped} skipped${tag}`
    );
    if (result.errors.length > 0) {
      for (const e of result.errors.slice(0, 3)) console.log(`      • ${e}`);
      if (result.errors.length > 3) console.log(`      …and ${result.errors.length - 3} more`);
    }
  }

  console.log(
    `\nDone. ${totalInserted} inserted, ${totalSkipped} skipped, ${totalErrors} row errors, ` +
      `${failures.length} team files failed.`
  );
  if (failures.length > 0) {
    console.log("\nFailed files:");
    for (const f of failures) console.log(`  ${f.slug}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
