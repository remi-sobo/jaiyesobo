import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import PinPad from "@/components/me/pin-pad";

export const dynamic = "force-dynamic";

export default async function AdminLockPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <PinPad
        length={6}
        endpoint="/api/auth/admin"
        successRedirect="/admin"
        label="Admin PIN"
      />
    </main>
  );
}
