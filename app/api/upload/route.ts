import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadPhoto, folderNameForSubject } from "@/lib/google/drive";
import { slugify, extForMime } from "@/lib/slugify";

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const taskId = form.get("taskId");
  const reflectionRaw = form.get("reflection");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (typeof taskId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }
  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      return NextResponse.json({ error: "not_an_image" }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "file_too_big" }, { status: 400 });
    }
  }

  const reflection =
    typeof reflectionRaw === "string" && reflectionRaw.trim().length > 0
      ? reflectionRaw.trim()
      : null;

  const supa = createServiceClient();
  const { data: task, error: tErr } = await supa
    .from("tasks")
    .select("id, title, subject, type, completion_type")
    .eq("id", taskId)
    .maybeSingle();
  if (tErr || !task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });

  if (task.completion_type === "photo_and_reflection" && !reflection) {
    return NextResponse.json({ error: "reflection_required" }, { status: 400 });
  }

  const subjectFolder = folderNameForSubject(task.subject, task.type);
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(task.title || "task");

  const driveIds: string[] = [];
  const thumbnails: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = extForMime(file.type);
    const counter = files.length > 1 ? `_${String(i + 1).padStart(3, "0")}` : "";
    const filename = `${today}_${slug}${counter}.${ext}`;
    try {
      const { id, thumbnail } = await uploadPhoto(file, subjectFolder, filename);
      driveIds.push(id);
      if (thumbnail) thumbnails.push(thumbnail);
    } catch (err) {
      console.error(`Drive upload failed for ${filename}:`, err);
      return NextResponse.json({ error: "drive_upload_failed" }, { status: 500 });
    }
  }

  const { error: cErr } = await supa.from("completions").insert({
    task_id: taskId,
    photo_drive_ids: driveIds,
    photo_thumbnails: thumbnails,
    reflection,
  });
  if (cErr) {
    console.error("Completion insert failed:", cErr);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: driveIds.length });
}
