import type { DraftPlayerPayload, DraftPosition } from "@/lib/draft-data";

const POSITIONS = new Set<DraftPosition>(["G", "F", "C"]);

export type ValidationResult =
  | { ok: true; player: DraftPlayerPayload }
  | { ok: false; error: string };

export function validatePlayer(input: unknown, index = 0): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: `[${index}] not an object` };
  }
  const o = input as Record<string, unknown>;

  if (typeof o.name !== "string" || o.name.trim().length === 0) {
    return { ok: false, error: `[${index}] missing name` };
  }
  const name = o.name.trim();

  if (!Array.isArray(o.search_aliases)) {
    return { ok: false, error: `[${index}:${name}] search_aliases must be an array` };
  }
  const aliases = o.search_aliases
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  if (typeof o.primary_position !== "string" || !POSITIONS.has(o.primary_position as DraftPosition)) {
    return { ok: false, error: `[${index}:${name}] primary_position must be G | F | C` };
  }
  const primary = o.primary_position as DraftPosition;

  if (!Array.isArray(o.secondary_positions)) {
    return { ok: false, error: `[${index}:${name}] secondary_positions must be an array` };
  }
  const secondary: DraftPosition[] = [];
  for (const p of o.secondary_positions) {
    if (typeof p !== "string" || !POSITIONS.has(p as DraftPosition)) {
      return { ok: false, error: `[${index}:${name}] invalid secondary_position "${String(p)}"` };
    }
    secondary.push(p as DraftPosition);
  }

  if (!o.team_stint || typeof o.team_stint !== "object") {
    return { ok: false, error: `[${index}:${name}] team_stint missing` };
  }
  const stint = o.team_stint as Record<string, unknown>;
  if (typeof stint.years !== "string" || stint.years.trim().length === 0) {
    return { ok: false, error: `[${index}:${name}] team_stint.years missing` };
  }
  if (typeof stint.peak_label !== "string" || stint.peak_label.trim().length === 0) {
    return { ok: false, error: `[${index}:${name}] team_stint.peak_label missing` };
  }
  if (typeof stint.is_iconic !== "boolean") {
    return { ok: false, error: `[${index}:${name}] team_stint.is_iconic must be boolean` };
  }

  return {
    ok: true,
    player: {
      name,
      search_aliases: aliases,
      primary_position: primary,
      secondary_positions: secondary,
      team_stint: {
        years: stint.years.trim(),
        peak_label: stint.peak_label.trim(),
        is_iconic: stint.is_iconic,
      },
    },
  };
}

export function validatePlayerArray(
  input: unknown
): { ok: true; players: DraftPlayerPayload[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["Top-level value must be an array of players."] };
  }
  const errors: string[] = [];
  const players: DraftPlayerPayload[] = [];
  input.forEach((item, i) => {
    const r = validatePlayer(item, i);
    if (r.ok) players.push(r.player);
    else errors.push(r.error);
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, players };
}

/** Strip ```json ... ``` fences and find the first balanced JSON value. */
export function extractJson(text: string): string | null {
  const trimmed = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fence ? fence[1].trim() : trimmed;
  // Find first { or [
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (ch !== "{" && ch !== "[") continue;
    const open = ch;
    const close = ch === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < candidate.length; j++) {
      const c = candidate[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return candidate.slice(i, j + 1);
      }
    }
    return null;
  }
  return null;
}
