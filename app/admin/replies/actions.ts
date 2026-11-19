"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/session";
import { decide, revokeAllLinks, type Decision, type DecideResult, type Viewer } from "@/lib/instagram/data";
import { verifyPickerToken } from "@/lib/instagram/tokens";

async function viewer(token: string | null): Promise<Viewer | null> {
  if (await getAdminSession()) return { kind: "admin" };
  const t = verifyPickerToken(token);
  return t ? { kind: "link", batchId: t.batchId } : null;
}

export async function decideAction(token: string | null, commentId: string, d: Decision): Promise<DecideResult> {
  const v = await viewer(token);
  if (!v) return { ok: false, error: "This link expired." };
  const r = await decide(v, commentId, d);
  revalidatePath("/admin/replies");
  return r;
}

export async function revokeLinksAction(): Promise<void> {
  if (!(await getAdminSession())) return;
  await revokeAllLinks();
  revalidatePath("/admin/setup");
}
