import type { Metadata } from "next";
import { getAdminSession } from "@/lib/session";
import Sidebar from "@/components/admin/sidebar";
import { ensureJaiye, getSidebarCounts } from "@/lib/admin-data";

export const metadata: Metadata = {
  title: "Jaiye · Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const lockOnly = !session;

  // Pass zeros if we're on /admin/lock (unauthenticated); Sidebar won't render there.
  let uploadsCount = 0;
  let pendingQuestions = 0;
  let newFeedback = 0;

  if (session) {
    try {
      const jaiye = await ensureJaiye();
      const counts = await getSidebarCounts(jaiye.id);
      uploadsCount = counts.uploadsCount;
      pendingQuestions = counts.pendingQuestions;
      newFeedback = counts.newFeedback;
    } catch {
      // schema or seed not ready yet; just show zeros
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] text-[var(--color-bone)]">
      {lockOnly ? (
        children
      ) : (
        <div className="flex min-h-screen">
          <Sidebar
            uploadsCount={uploadsCount}
            pendingQuestions={pendingQuestions}
            newFeedback={newFeedback}
          />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      )}
    </div>
  );
}
