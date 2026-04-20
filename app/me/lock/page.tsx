import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getKidSession } from "@/lib/session";
import PinPad from "@/components/me/pin-pad";

export const metadata: Metadata = {
  title: "Jaiye · Lock",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

function safeNext(raw: string | undefined): string {
  if (!raw) return "/me";
  // only allow in-app paths starting with /me
  if (!raw.startsWith("/me")) return "/me";
  return raw;
}

export default async function LockPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  const session = await getKidSession();
  if (session) redirect(dest);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <PinPad
        length={4}
        endpoint="/api/auth/kid"
        successRedirect={dest}
        label="Enter your PIN"
      />
    </main>
  );
}
