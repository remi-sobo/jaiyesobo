import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { getBlindRankTopicById, getLiveBlindRankTopics } from "@/lib/games/blind-rank-data";
import { pickRandom, ROUND_COUNT, type BlindRankPlayItem, type BlindRankPlayPayload } from "@/lib/games/blind-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const topicId = (body as { topic_id?: unknown }).topic_id;
  if (typeof topicId !== "string" || topicId.trim().length === 0) {
    return NextResponse.json({ error: "missing_topic_id" }, { status: 400 });
  }

  // Guard: must be a verified, live topic.
  const topic = await getBlindRankTopicById(topicId);
  if (
    !topic ||
    topic.status !== "live" ||
    topic.verification_status !== "verified"
  ) {
    // If there are also no other verified topics at all, return the friendlier
    // 503 to let the UI explain Jaiye is still curating.
    const anyLive = await getLiveBlindRankTopics();
    if (anyLive.length === 0) {
      return NextResponse.json(
        {
          error: "no_topics_ready",
          message: "No topics ready yet — Jaiye is curating",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "topic_not_found" }, { status: 404 });
  }

  if (topic.payload.items.length < ROUND_COUNT) {
    return NextResponse.json({ error: "topic_too_small" }, { status: 500 });
  }

  // Server-side: pick 5 of the pool at random, then shuffle reveal order.
  // canonical_rank stays server-side; never sent to client until /finish.
  const pulled = pickRandom(topic.payload.items, ROUND_COUNT);
  const revealOrder = pickRandom(pulled, ROUND_COUNT);
  const playItems: BlindRankPlayItem[] = revealOrder.map((it, idx) => ({
    item_index: idx,
    name: it.name,
    canonical_rank: it.rank,
    fact: it.fact,
  }));

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  const supa = createServiceClient();
  const token = shareToken();
  const payload: BlindRankPlayPayload = {
    topic_id: topic.id,
    topic_title: topic.payload.title,
    topic_subtitle: topic.payload.subtitle,
    category: topic.payload.category,
    difficulty: topic.payload.difficulty,
    kind: topic.payload.kind,
    items: playItems,
    placements: {},
  };

  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug: "blind-rank",
      user_id,
      anon_session_id,
      payload,
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(
      JSON.stringify({ scope: "games.blind-rank.start", err: error?.message })
    );
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  // Send only the safe fields: item_index + name. NO rank, NO fact.
  return NextResponse.json({
    play_id: data.id,
    share_token: data.share_token,
    topic_title: topic.payload.title,
    topic_subtitle: topic.payload.subtitle,
    kind: topic.payload.kind,
    items: playItems.map((i) => ({ item_index: i.item_index, name: i.name })),
  });
}
