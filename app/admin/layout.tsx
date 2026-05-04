import type { Metadata } from "next";
import { getAdminSession } from "@/lib/session";
import Sidebar from "@/components/admin/sidebar";
import { getSidebarCounts } from "@/lib/admin-data";
import { getActiveKid, getAllKids, type Kid } from "@/lib/admin-context";

export const metadata: Metadata = {
  title: "Admin · Sobo",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const lockOnly = !session;

  // Pass safe defaults if we're on /admin/lock (unauthenticated); Sidebar won't render there.
  let uploadsCount = 0;
  let pendingQuestions = 0;
  let newFeedback = 0;
  let activeKid: Kid = { id: "", display_name: "Jaiye" };
  let kids: Kid[] = [];

  if (session) {
    try {
      activeKid = await getActiveKid();
      kids = await getAllKids();
      const counts = await getSidebarCounts(activeKid.id);
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
            kids={kids}
            activeKidId={activeKid.id}
            activeKidName={activeKid.display_name}
          />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      )}
    </div>
  );
}
