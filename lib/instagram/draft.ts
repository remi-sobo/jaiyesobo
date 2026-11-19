import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanOption, preFlag } from "./rules";

/**
 * Writes 3 reply options per comment in Jaiye's voice, or flags the comment
 * for a parent. Kendra's recent picks and her own replies go in as examples,
 * so the options drift toward what she actually chooses.
 */

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-6"];

const VOICE = `You write Instagram comment replies for Jaiye, a 9-year-old basketball fan who runs the On The Court podcast (@onthecourt_pod) and the Run It Back Picks game at jaiyesobo.com. Jaiye is a Blazers fan.

Voice:
- Sound like a real 9-year-old typing. Short, casual, lowercase is fine. Not a teen, not an adult, not a brand.
- Funny and witty. Stand ground on some takes, be humble on others.
- End in a way that invites another comment (a question back, a challenge, a "we'll see").
- Never mean, never antagonistic, never sarcastic at someone's expense.
- One emoji at most, often none. No hashtags. No em dashes. No inside jokes that need explaining.
- Don't make up stats, scores or facts. If you don't know the play, talk about the take, not the details.
- Never mention age, school, location, or anything personal. Never ask anyone to DM.

Each comment gets exactly 3 options that are clearly different:
1. holds Jaiye's ground
2. gives a little, or is a good sport about it
3. asks a question back

Flag the comment instead (flagged: true, a short reason, no options) if it is crude, sexual, hateful, a personal attack, spam, asks for contact or personal details, or reads like an adult being overly familiar with a kid. When unsure, flag it. A parent decides.`;

const Result = z.object({
  replies: z.array(
    z.object({
      id: z.string(),
      flagged: z.boolean(),
      reason: z.string().optional(),
      options: z.array(z.string()),
    }),
  ),
});

export type DraftInput = { id: string; username: string; text: string; caption: string | null };
export type Draft = { id: string; flagged: boolean; reason: string | null; options: string[] };

/** The last 20 replies a parent chose, newest first. Their own words count double. */
async function examples(): Promise<string> {
  const supa = createServiceClient();
  const { data } = await supa
    .from("ig_comments")
    .select("text, posted_text, custom_text")
    .eq("status", "posted")
    .order("decided_at", { ascending: false })
    .limit(20);
  if (!data?.length) return "";
  const lines = data.map((r) => `- comment: "${r.text}"\n  ${r.custom_text ? "parent wrote" : "parent picked"}: "${r.posted_text}"`);
  return `\n\nRecent replies the parents chose (match this style; "parent wrote" ones are the strongest signal):\n${lines.join("\n")}`;
}

export async function draftReplies(items: DraftInput[]): Promise<Draft[]> {
  const out: Draft[] = [];
  const toModel: DraftInput[] = [];
  for (const it of items) {
    const pf = preFlag(it.username, it.text);
    if (pf.flagged) out.push({ id: it.id, flagged: true, reason: pf.reason, options: [] });
    else toModel.push(it);
  }
  if (!toModel.length) return out;

  const system = VOICE + (await examples());
  const prompt = `Write replies for these comments. Use each comment's id.\n\n${JSON.stringify(
    toModel.map((c) => ({ id: c.id, username: c.username, comment: c.text, post_caption: c.caption ?? "" })),
    null,
    2,
  )}`;

  let result: z.infer<typeof Result> | null = null;
  let last: unknown;
  for (const model of MODELS) {
    try {
      const { object } = await generateObject({ model: anthropic(model), schema: Result, system, prompt });
      result = object;
      break;
    } catch (e) {
      last = e;
    }
  }
  if (!result) throw last instanceof Error ? last : new Error(String(last));

  const byId = new Map(result.replies.map((r) => [r.id, r]));
  for (const it of toModel) {
    const r = byId.get(it.id);
    if (!r) {
      out.push({ id: it.id, flagged: true, reason: "No draft came back; take a look", options: [] });
      continue;
    }
    if (r.flagged) {
      out.push({ id: it.id, flagged: true, reason: r.reason?.trim() || "Needs a parent", options: [] });
      continue;
    }
    const options = r.options.slice(0, 3).map(cleanOption).filter((s): s is string => !!s);
    out.push({ id: it.id, flagged: false, reason: null, options });
  }
  return out;
}
