import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadPhoto, folderNameForSubject } from "@/lib/google/drive";
import { slugify, extForMime } from "@/lib/slugify";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

function log(level: "info" | "warn" | "error", msg: string, data: Record<string, unknown> = {}) {
  const payload = { scope: "upload", msg, ...data, ts: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) {
    log("warn", "unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    // Vercel rejects oversized request bodies with 413 before our handler runs,
    // but defensively handle parse failures here too.
    log("error", "body_parse_failed", { err: String(err) });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const taskId = form.get("taskId");
  const reflectionRaw = form.get("reflection");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  const totalBytes = files.reduce((n, f) => n + f.size, 0);

  if (typeof taskId !== "string") {
    log("warn", "missing_task_id");
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (files.length === 0) {
    log("warn", "no_files", { taskId });
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    log("warn", "too_many_files", { taskId, count: files.length });
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }
  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      log("warn", "not_an_image", { taskId, type: f.type });
      return NextResponse.json({ error: "not_an_image" }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      log("warn", "file_too_big", { taskId, size: f.size });
      return NextResponse.json({ error: "file_too_big" }, { status: 413 });
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
  if (tErr || !task) {
    log("error", "task_not_found", { taskId, err: tErr?.message });
    return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  }

  if (task.completion_type === "photo_and_reflection" && !reflection) {
    return NextResponse.json({ error: "reflection_required" }, { status: 400 });
  }

  const subjectFolder = folderNameForSubject(task.subject, task.type);
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(task.title || "task");

  log("info", "upload_start", {
    taskId,
    fileCount: files.length,
    totalBytes,
    subject: task.subject,
    subjectFolder,
  });

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
      log("error", "drive_upload_failed", {
        taskId,
        filename,
        fileSize: file.size,
        err: String(err),
      });
      return NextResponse.json({ error: "drive_upload_failed" }, { status: 502 });
    }
  }

  const { error: cErr } = await supa.from("completions").insert({
    task_id: taskId,
    photo_drive_ids: driveIds,
    photo_thumbnails: thumbnails,
    reflection,
  });
  if (cErr) {
    log("error", "completion_insert_failed", { taskId, err: cErr.message });
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  log("info", "upload_success", { taskId, count: driveIds.length });
  return NextResponse.json({ ok: true, count: driveIds.length });
}
