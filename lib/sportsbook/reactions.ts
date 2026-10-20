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
