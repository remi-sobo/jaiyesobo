/**
 * Leaderboard data helpers for the 2-player friend mode of The Draft Room.
 * Scoped per-session: each device/family gets their own record book by
 * filtering on anon_session_id (or user_id if authed). No cross-family
 * leakage.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSession, sessionKey } from "@/lib/games/session";
import type { DraftPlayPayload, DraftJudgement } from "@/lib/draft-game";

export type Match = {
  play_id: string;
  share_token: string | null;
  team_city: string;
  team_name: string;
  team_abbreviation: string;
  primary_color: string;
  p1: string;
  p2: string;
  winner: "p1" | "p2" | "tie";
  verdict: string;
  played_at: string; // ISO
};

export type HeadToHead = {
  /** Sorted alphabetically so (a, b) === (b, a). */
  pair_key: string;
  player_a: string; // alphabetical first
  player_b: string;
  a_wins: number;
  b_wins: number;
  ties: number;
  total: number;
  last_played_at: string;
};

export type PlayerRecord = {
  name: string;
  wins: number;
  losses: number;
  ties: number;
  total: number;
};

export type TeamCount = {
  team_slug: string;
  team_label: string;
  primary_color: string;
  count: number;
};

export type LeaderboardData = {
  matches: Match[];
  head_to_head: HeadToHead[];
  player_records: PlayerRecord[];
  team_counts: TeamCount[];
  has_session: boolean;
};

const EMPTY: LeaderboardData = {
  matches: [],
  head_to_head: [],
  player_records: [],
  team_counts: [],
  has_session: false,
};

/**
 * Build the leaderboard for the current session. Returns EMPTY if there's
 * no session cookie yet (first-time visitor — they haven't played).
 */
export async function getLeaderboardForCurrentSession(): Promise<LeaderboardData> {
  const session = await getCurrentSession();
  if (!session) return EMPTY;

  const { user_id, anon_session_id } = sessionKey(session);
  const supa = createServiceClient();

  // Pull all completed friend-mode draft plays for this session
  let q = supa
    .from("plays")
    .select("id, share_token, payload, result, created_at")
    .eq("game_slug", "draft")
    .not("result", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (user_id) q = q.eq("user_id", user_id);
  else if (anon_session_id) q = q.eq("anon_session_id", anon_session_id);
  else return { ...EMPTY, has_session: true };

  const { data, error } = await q;
  if (error || !data) return { ...EMPTY, has_session: true };

  const matches: Match[] = [];
  for (const row of data) {
    const p = row as {
      id: string;
      share_token: string | null;
      payload: DraftPlayPayload;
      result: DraftJudgement;
      created_at: string;
    };
    if (p.payload?.mode !== "vs-friend") continue;
    if (!p.payload?.player_names) continue;
    if (!p.result?.winner) continue;
    const p1 = p.payload.player_names.human;
    const p2 = p.payload.player_names.ai;
    const winner: "p1" | "p2" | "tie" =
      p.result.winner === "human" ? "p1" : p.result.winner === "ai" ? "p2" : "tie";
    matches.push({
      play_id: p.id,
      share_token: p.share_token,
      team_city: p.payload.team.city,
      team_name: p.payload.team.name,
      team_abbreviation: p.payload.team.abbreviation,
      primary_color: p.payload.team.primary_color,
      p1,
      p2,
      winner,
      verdict: p.result.verdict ?? "",
      played_at: p.created_at,
    });
  }

  return {
    matches: matches.slice(0, 50),
    head_to_head: buildHeadToHead(matches),
    player_records: buildPlayerRecords(matches),
    team_counts: buildTeamCounts(matches, data),
    has_session: true,
  };
}

function buildHeadToHead(matches: Match[]): HeadToHead[] {
  const map = new Map<string, HeadToHead>();
  for (const m of matches) {
    const [a, b] = [m.p1, m.p2].map((n) => n.trim());
    // Stable order: alphabetical (case-insensitive)
    const ascending = a.toLowerCase() <= b.toLowerCase();
    const player_a = ascending ? a : b;
    const player_b = ascending ? b : a;
    const key = `${player_a.toLowerCase()}::${player_b.toLowerCase()}`;
    const existing = map.get(key);
    const isATie = m.winner === "tie";
    const aWonThis =
      !isATie && ((ascending && m.winner === "p1") || (!ascending && m.winner === "p2"));
    const bWonThis = !isATie && !aWonThis;

    if (existing) {
      existing.a_wins += aWonThis ? 1 : 0;
      existing.b_wins += bWonThis ? 1 : 0;
      existing.ties += isATie ? 1 : 0;
      existing.total += 1;
      // matches are already sorted desc, so the first match we see is the most recent
    } else {
      map.set(key, {
        pair_key: key,
        player_a,
        player_b,
        a_wins: aWonThis ? 1 : 0,
        b_wins: bWonThis ? 1 : 0,
        ties: isATie ? 1 : 0,
        total: 1,
        last_played_at: m.played_at,
      });
    }
  }
  return Array.from(map.values()).sort((x, y) => y.total - x.total);
}

function buildPlayerRecords(matches: Match[]): PlayerRecord[] {
  const map = new Map<string, PlayerRecord>();
  function bump(name: string, kind: "win" | "loss" | "tie") {
    const key = name.trim().toLowerCase();
    const existing = map.get(key) ?? {
      name: name.trim(),
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };
    if (kind === "win") existing.wins += 1;
    else if (kind === "loss") existing.losses += 1;
    else existing.ties += 1;
    existing.total += 1;
    map.set(key, existing);
  }
  for (const m of matches) {
    if (m.winner === "tie") {
      bump(m.p1, "tie");
      bump(m.p2, "tie");
    } else if (m.winner === "p1") {
      bump(m.p1, "win");
      bump(m.p2, "loss");
    } else {
      bump(m.p2, "win");
      bump(m.p1, "loss");
    }
  }
  return Array.from(map.values()).sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
}

function buildTeamCounts(
  matches: Match[],
  rawRows: Array<{ payload: DraftPlayPayload }>
): TeamCount[] {
  const map = new Map<string, TeamCount>();
  for (const m of matches) {
    // Recover team_slug from raw rows by matching team city+name
    const key = `${m.team_city.toLowerCase()}::${m.team_name.toLowerCase()}`;
    const slug = rawRows.find(
      (r) =>
        r.payload?.team?.city?.toLowerCase() === m.team_city.toLowerCase() &&
        r.payload?.team?.name?.toLowerCase() === m.team_name.toLowerCase()
    )?.payload.team_slug ?? key;

    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(slug, {
        team_slug: slug,
        team_label: `${m.team_city} ${m.team_name}`,
        primary_color: m.primary_color,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
