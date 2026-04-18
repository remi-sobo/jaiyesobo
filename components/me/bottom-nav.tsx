"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/me/lock");
    router.refresh();
  }

  return (
    <nav className="mt-12 pt-8 border-t border-[var(--color-line)] flex justify-between items-center font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
      <div className="flex gap-8">
        <Link href="/me" className="hover:text-[var(--color-red)] transition-colors">
          ← Today
        </Link>
        <Link href="/me/week" className="hover:text-[var(--color-red)] transition-colors">
          This Week
        </Link>
        <Link href="/me/photos" className="hover:text-[var(--color-red)] transition-colors">
          My Photos
        </Link>
      </div>
      <button type="button" onClick={logout} className="hover:text-[var(--color-red)] transition-colors">
        Log out
      </button>
    </nav>
  );
}
