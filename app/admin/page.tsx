import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  await requireAdmin();
  redirect("/admin/plan");
}
