import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";
import {
  expandAnchorsForDate,
  normTime,
  addMinutes,
  toMinutes,
  DEFAULT_TASK_MINUTES,
} from "@/lib/schedule";
import { getAllAnchorsForUser } from "@/lib/anchors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { task_id, time } = body as { task_id?: unknown; time?: unknown };
  if (typeof task_id !== "string" || typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  const { data: task, error: tErr } = await supa
    .from("tasks")
    .select("id, user_id, date, estimated_minutes, scheduled_time")
    .eq("id", task_id)
    .maybeSingle();
  if (tErr || !task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  if (task.user_id !== jaiye.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const dur = task.estimated_minutes ?? DEFAULT_TASK_MINUTES;
  const newStart = time;
  const newEnd = addMinutes(time, dur);

  // Check overlap with anchors for that date
  const anchorsAll = await getAllAnchorsForUser(jaiye.id);
  const anchors = expandAnchorsForDate(anchorsAll, new Date(`${task.date}T00:00:00`));
  for (const a of anchors) {
    if (rangesOverlap(newStart, newEnd, normTime(a.start_time), normTime(a.end_time))) {
      return NextResponse.json({ error: "anchor_conflict", anchor_title: a.title }, { status: 409 });
    }
  }

  // Check overlap with other scheduled tasks on the same date
  const { data: same } = await supa
    .from("tasks")
    .select("id, scheduled_time, estimated_minutes")
    .eq("user_id", jaiye.id)
    .eq("date", task.date)
    .neq("id", task_id)
    .not("scheduled_time", "is", null);
  for (const o of same ?? []) {
    if (!o.scheduled_time) continue;
    const oStart = normTime(o.scheduled_time);
    const oEnd = addMinutes(oStart, o.estimated_minutes ?? DEFAULT_TASK_MINUTES);
    if (rangesOverlap(newStart, newEnd, oStart, oEnd)) {
      return NextResponse.json({ error: "task_conflict" }, { status: 409 });
    }
  }

  const { error: uErr } = await supa
    .from("tasks")
    .update({ scheduled_time: newStart })
    .eq("id", task_id);
  if (uErr) {
    console.error(JSON.stringify({ scope: "tasks.schedule", err: uErr.message }));
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduled_time: newStart });
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}
