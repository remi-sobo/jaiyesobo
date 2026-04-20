import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const TaskShape = z.object({
  day_of_week: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  title: z.string().min(1).max(120),
  description: z.string().nullable(),
  subject: z.enum(["math", "reading", "writing", "science", "ball", "habit", "family", "other"]),
  type: z.enum(["homeschool", "habit", "chore", "ball", "family", "other"]),
  completion_type: z.enum(["photo", "reflection", "check", "photo_and_reflection"]),
  link: z.string().url().nullable(),
  reflection_prompt: z.string().nullable(),
});

const Parsed = z.object({ tasks: z.array(TaskShape) });

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "missing_key", hint: "Add ANTHROPIC_API_KEY to .env.local" },
      { status: 501 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { text } = body as { text?: unknown };
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: Parsed,
      system:
        "You are helping a parent plan their 8-year-old son Jaiye's homeschool week. Parse free-form week plans into structured tasks. Be generous with task descriptions — one or two sentences explaining what to do. Only use https URLs when explicitly present in the text. Use null for link/description/reflection_prompt when not applicable. Choose completion_type: photo for worksheets/visible work, reflection for pure writing/thinking, check for simple habits (make bed, scripture memory), photo_and_reflection for tasks with both visible output and a written reflection.",
      prompt: `Week plan text:\n\n${text.trim()}\n\nReturn the full array of tasks across all days mentioned.`,
    });
    return NextResponse.json({ tasks: object.tasks });
  } catch (err) {
    console.error("Parse-week failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
