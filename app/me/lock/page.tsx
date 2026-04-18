import { redirect } from "next/navigation";
import { getKidSession } from "@/lib/session";
import PinPad from "@/components/me/pin-pad";

export const dynamic = "force-dynamic";

export default async function LockPage() {
  const session = await getKidSession();
  if (session) redirect("/me");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <PinPad
        length={4}
        endpoint="/api/auth/kid"
        successRedirect="/me"
        label="Enter your PIN"
      />
    </main>
  );
}
