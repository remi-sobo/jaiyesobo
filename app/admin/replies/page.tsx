import type { Metadata } from "next";
import { getAdminSession } from "@/lib/session";
import { batchIsLive, listForViewer, type Viewer } from "@/lib/instagram/data";
import { verifyPickerToken } from "@/lib/instagram/tokens";
import ReplyPicker from "@/components/admin/replies/reply-picker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Replies · Sobo", robots: { index: false, follow: false } };

/**
 * The reply picker. Open to a signed-in admin, or to anyone holding a live
 * link from the 6am email (that morning's comments only). The admin layout
 * shows no sidebar for link viewers.
 */
export default async function RepliesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const admin = await getAdminSession();
  let v: Viewer | null = admin ? { kind: "admin" } : null;
  if (!v) {
    const tok = verifyPickerToken(t);
    if (tok && (await batchIsLive(tok.batchId))) v = { kind: "link", batchId: tok.batchId };
  }

  if (!v) {
    return (
      <main className="mx-auto max-w-[560px] px-4 py-16">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">This link expired.</h1>
        <p className="mt-3 text-[var(--color-warm-mute)]">A new one comes in tomorrow&apos;s 6am email.</p>
      </main>
    );
  }

  const { pending, done } = await listForViewer(v);
  return (
    <main className="mx-auto max-w-[620px] px-4 py-8 pb-24">
      <div className="mb-6">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          @onthecourt_pod
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-[-0.02em]">
          Replies<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--color-warm-mute)]">
          {pending.length ? `${pending.length} waiting. Each tap posts right away.` : "All caught up."}
        </p>
      </div>
      <ReplyPicker token={v.kind === "link" ? (t ?? null) : null} pending={pending} done={done} />
    </main>
  );
}
