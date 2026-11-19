"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { decide, morningRun, revokeAllLinks, type DecideResult, type Viewer } from "@/lib/instagram/data";
import { verifyPickerToken } from "@/lib/instagram/tokens";

async function viewer(token: string | null): Promise<Viewer | null> {
  if (await getAdminSession()) return { kind: "admin" };
  const t = verifyPickerToken(token);
  return t ? { kind: "link", batchId: t.batchId } : null;
}

export async function decideAction(token: unknown, commentId: unknown, d: unknown): Promise<DecideResult> {
  const v = await viewer(typeof token === "string" ? token : null);
  if (!v) return { ok: false, error: "This link expired." };
  if (typeof commentId !== "string") return { ok: false, error: "That didn't work. Reload and try again." };
  const r = await decide(v, commentId, d);
  revalidatePath("/admin/replies");
  return r;
}

export async function revokeLinksAction(): Promise<void> {
  if (!(await getAdminSession())) return;
  await revokeAllLinks();
  revalidatePath("/admin/setup");
}

/** Setup's "Run now": the 6am job at any hour, sending even if this morning's email went out. */
export async function runNowAction(): Promise<void> {
  if (!(await getAdminSession())) return;
  const r = await morningRun({ force: true });
  const msg =
    r.status === "done"
      ? `${r.newComments} new, ${r.inBatch} waiting, ${r.emailed ? "email sent" : "no email"}`
      : r.status === "skipped"
        ? r.reason
        : `Failed: ${r.error}`;
  redirect(`/admin/setup?ig_run=${encodeURIComponent(msg)}`);
}
