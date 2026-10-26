/**
 * Preset trash talk. Players pick a line from this list; nobody types free text,
 * so there is nothing to moderate except who posted. One line per player per
 * pick, only after the pick locks at tip-off.
 *
 * Keys are stored in the database. Never rename or remove a key; retire a line by
 * moving it to RETIRED so old posts still show.
 */
export const TALK_LINES = {
  check_on_remi: "Somebody check on Remi.",
  called_it_again: "Called it. Again.",
  not_ready: "Y'all aren't ready.",
  respect_upset: "Respect the upset.",
  running_it_back: "I'm running it back.",
  that_hurt: "That one hurt.",
  never_doubt: "Never doubt me.",
  lucky: "Lucky. That's all.",
  jaiye_knew: "Jaiye knew.",
  told_you: "Told you.",
  not_my_best: "Not my best work.",
  see_you_monday: "See you Monday.",
  ice_cold: "Ice cold.",
  who_had_this: "Who had this?",
  wrong_side: "Wrong side, right heart.",
  bench_me: "Bench me.",
} as const;

const RETIRED: Record<string, string> = {};

export type TalkKey = keyof typeof TALK_LINES;

export const TALK_KEYS = Object.keys(TALK_LINES) as TalkKey[];

export function isTalkKey(v: unknown): v is TalkKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TALK_LINES, v);
}

/** The words for a stored key, including retired lines. Unknown keys show nothing. */
export function talkText(key: string): string | null {
  if (isTalkKey(key)) return TALK_LINES[key];
  return RETIRED[key] ?? null;
}
