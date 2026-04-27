import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FeedbackSchema = z.object({
  nailed: z.array(z.string().max(150)).min(1).max(2),
  missing: z.array(z.string().max(150)).min(1).max(2),
  try_this: z.string().max(180),
});

const SYSTEM_PROMPT = `You are an encouraging writing coach for an 8-year-old named Jaiye who is learning to write sports recaps. He just wrote his first draft of an article about an NBA Playoff game. Your job is to give him short, specific, kid-friendly feedback that helps him write a better v2.

CRITICAL RULES:
- He is 8. Use simple words.
- Be encouraging. Praise specific things, not generic things.
- Never say his article is "good" or "great" without saying WHY specifically.
- Don't critique grammar or spelling — that's not what we're working on.
- Don't ask him to write more — quality over quantity.
- ONE concrete suggestion for v2. Just one. Specific. Actionable.
- Reference his actual content. Quote phrases he wrote.

Each "nailed" item: under 15 words, specific praise, references his actual words.
Each "missing" item: under 15 words, specific gap, names what's not there.
"try_this" field: ONE concrete suggestion for v2, under 25 words, specific action.

Examples of good feedback:
- nailed: "You nailed who won and by how much in your first sentence."
- nailed: "Calling it 'a stunner' makes it feel exciting."
- missing: "You wrote about the 4th quarter but didn't say who won it."
- missing: "Your closer doesn't connect to the lede."
- try_this: "Add one sentence about the biggest moment — you had it in your notes but it didn't make it into the article."`;

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "missing_key", message: "AI feedback isn't configured. Show Dad." },
      { status: 501 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { prep, articleV1 } = body as { prep?: unknown; articleV1?: unknown };
  if (typeof articleV1 !== "string" || articleV1.trim().length === 0) {
    return NextResponse.json({ error: "no_article" }, { status: 400 });
  }

  const prepBlock = prep && typeof prep === "object" ? formatPrep(prep as Record<string, unknown>) : "(no prep notes)";
  const userPrompt = `Here are Jaiye's prep notes:

${prepBlock}

And here is his v1 article:

${articleV1.trim()}

Read both and respond with the structured feedback.`;

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: FeedbackSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    return NextResponse.json({ feedback: object });
  } catch (err) {
    console.error(JSON.stringify({ scope: "sports-recap.feedback", err: String(err) }));
    return NextResponse.json(
      { error: "ai_failed", message: "AI took too long. Show Dad — he can give you feedback." },
      { status: 502 }
    );
  }
}

function formatPrep(prep: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(prep)) {
    if (typeof v !== "string" || v.trim().length === 0) continue;
    lines.push(`- ${k}: ${v.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : "(empty)";
}
