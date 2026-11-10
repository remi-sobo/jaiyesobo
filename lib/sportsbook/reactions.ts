/** The fixed emoji set for reactions. No free text, so nothing to moderate. */
export const REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "laugh", emoji: "😂", label: "Funny" },
  { key: "cold", emoji: "🥶", label: "Ice cold" },
  { key: "clown", emoji: "🤡", label: "Clown pick" },
  { key: "target", emoji: "🎯", label: "Called it" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];

export function isReactionKey(v: unknown): v is ReactionKey {
  return REACTIONS.some((r) => r.key === v);
}

/** One pick's reactions as the loaders produce them: counts per emoji, plus the emoji the viewer gave. */
export type ReactionSlot = { counts: Partial<Record<ReactionKey, number>>; mine: ReactionKey[] };

/** Reactions on one house pick in the shape the app API sends. */
export type PickReactions = { reactions: Partial<Record<ReactionKey, number>>; my_reaction: ReactionKey | null };

/**
 * Picks one pick's slot out of a loader map (keyed `${item_id}:${player_id}`).
 * Nothing is revealed before the item locks. A viewer can hold several emoji on
 * one pick (each emoji toggles on its own), so `my_reaction` is the first of
 * them in REACTIONS order, which keeps the answer stable between requests.
 */
export function housePickReactions(slots: Record<string, ReactionSlot>, itemId: string, playerId: string, locked: boolean): PickReactions {
  const slot = locked ? slots[`${itemId}:${playerId}`] : undefined;
  if (!slot) return { reactions: {}, my_reaction: null };
  return {
    reactions: { ...slot.counts },
    my_reaction: REACTIONS.find((r) => slot.mine.includes(r.key))?.key ?? null,
  };
}
