import { createServiceClient } from "@/lib/supabase/server";

export type DraftPosition = "G" | "F" | "C";

export type DraftTeamStint = {
  years: string;
  peak_label: string;
  is_iconic: boolean;
};

export type DraftPlayerPayload = {
  name: string;
  search_aliases: string[];
  primary_position: DraftPosition;
  secondary_positions: DraftPosition[];
  team_stint: DraftTeamStint;
};

export type DraftPlayerRow = {
  id: string;
  draft_team_slug: string;
  status: string;
  verification_status: "pending" | "verified" | "rejected";
  payload: DraftPlayerPayload;
  created_at: string;
};

export type DraftTeamPayload = {
  name: string;
  city: string;
  abbreviation: string;
  primary_color: string;
  founded: string;
};

export type DraftTeamRow = {
  id: string;
  draft_team_slug: string;
  status: string;
  verification_status: "pending" | "verified" | "rejected";
  payload: DraftTeamPayload;
  created_at: string;
};

export type DraftTeamSummary = {
  slug: string;
  team: DraftTeamPayload;
  total_players: number;
  pending: number;
  verified: number;
  rejected: number;
};

export async function getAllDraftTeams(): Promise<DraftTeamRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, draft_team_slug, status, verification_status, payload, created_at")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team")
    .order("draft_team_slug");
  if (error) throw error;
  return (data ?? []) as unknown as DraftTeamRow[];
}

export async function getTeamPlayerCounts(): Promise<
  Record<string, { total: number; pending: number; verified: number; rejected: number }>
> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("draft_team_slug, verification_status")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player");
  if (error) throw error;
  const out: Record<string, { total: number; pending: number; verified: number; rejected: number }> = {};
  for (const row of data ?? []) {
    const slug = (row as { draft_team_slug: string | null }).draft_team_slug;
    const status = (row as { verification_status: string }).verification_status;
    if (!slug) continue;
    const entry = out[slug] ?? { total: 0, pending: 0, verified: 0, rejected: 0 };
    entry.total += 1;
    if (status === "pending") entry.pending += 1;
    else if (status === "verified") entry.verified += 1;
    else if (status === "rejected") entry.rejected += 1;
    out[slug] = entry;
  }
  return out;
}

export async function getDraftTeamSummaries(): Promise<DraftTeamSummary[]> {
  const [teams, counts] = await Promise.all([getAllDraftTeams(), getTeamPlayerCounts()]);
  return teams.map((t) => {
    const c = counts[t.draft_team_slug] ?? { total: 0, pending: 0, verified: 0, rejected: 0 };
    return {
      slug: t.draft_team_slug,
      team: t.payload,
      total_players: c.total,
      pending: c.pending,
      verified: c.verified,
      rejected: c.rejected,
    };
  });
}

export async function getDraftTeamBySlug(slug: string): Promise<DraftTeamRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, draft_team_slug, status, verification_status, payload, created_at")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team")
    .eq("draft_team_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DraftTeamRow) ?? null;
}

export async function getPlayersForTeam(slug: string): Promise<DraftPlayerRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, draft_team_slug, status, verification_status, payload, created_at")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player")
    .eq("draft_team_slug", slug)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r as unknown as DraftPlayerRow);
}
