import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import PinPad from "@/components/me/pin-pad";

export const metadata: Metadata = {
  title: "Admin · Lock",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

function safeNext(raw: string | undefined): string {
  if (!raw) return "/admin";
  if (!raw.startsWith("/admin")) return "/admin";
  return raw;
}

export default async function AdminLockPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  const session = await getAdminSession();
  if (session) redirect(dest);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <PinPad
        length={6}
        endpoint="/api/auth/admin"
        successRedirect={dest}
        label="Admin PIN"
      />
    </main>
  );
}
