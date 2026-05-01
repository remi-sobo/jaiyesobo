/**
 * Fuzzy player search for the Draft Room.
 *
 * Ranks pool players against a query by checking name + search_aliases.
 * Designed for an 8-year-old typing names: forgiving on partial matches,
 * case-insensitive, alias-aware. Returns top N hits with score + reason.
 */

import type { DraftPoolPlayer } from "@/lib/draft-game";

export type SearchHit = {
  id: string;
  name: string;
  primary_position: "G" | "F" | "C";
  team_stint_years: string;
  /** Why we matched (e.g. `aka "Magic"`, or empty if name match). */
  reason: string;
  score: number;
};

/**
 * Score thresholds (higher = better):
 *   1000 — exact match on name
 *    900 — exact match on alias
 *    800 — name starts with query
 *    700 — alias starts with query
 *    500 — query at word boundary in name
 *    400 — query at word boundary in alias
 *    300 — name contains query
 *    200 — alias contains query
 *      0 — no match (filtered out)
 */
function scoreCandidate(candidate: string, q: string): number {
  if (!candidate || !q) return 0;
  const c = candidate.toLowerCase();
  if (c === q) return 1000;
  if (c.startsWith(q)) return 800;
  // word boundary: match after a space
  if (c.includes(" " + q)) return 500;
  if (c.includes(q)) return 300;
  return 0;
}

export function searchPool(
  pool: DraftPoolPlayer[],
  query: string,
  excludeIds: ReadonlySet<string> = new Set(),
  limit = 6
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const p of pool) {
    if (excludeIds.has(p.id)) continue;

    const nameScore = scoreCandidate(p.name, q);
    let bestScore = nameScore;
    let bestReason = "";

    for (const alias of p.search_aliases) {
      const s = scoreCandidate(alias, q);
      // alias scores get a slight penalty so name matches lead when tied
      const adjusted = s === 1000 ? 900 : s === 800 ? 700 : s === 500 ? 400 : s === 300 ? 200 : 0;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestReason = `aka "${alias}"`;
      }
    }

    if (bestScore > 0) {
      hits.push({
        id: p.id,
        name: p.name,
        primary_position: p.primary_position,
        team_stint_years: p.team_stint.years,
        reason: bestReason,
        score: bestScore,
      });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  return hits.slice(0, limit);
}
