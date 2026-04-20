"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  uploadsCount: number;
  pendingQuestions: number;
};

export default function Sidebar({ uploadsCount, pendingQuestions }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await fetch("/api/auth/logout?scope=admin", { method: "POST" });
    router.replace("/admin/lock");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-[var(--color-warm-surface)] border-r border-[var(--color-line)] px-5 py-8 flex flex-col gap-10 sticky top-0 h-screen">
      <div className="pb-6 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight">
          Jaiye<span className="italic font-normal text-[var(--color-red)]">.</span>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mt-1">
          Admin
        </div>
      </div>

      <NavGroup label="This week">
        <NavItem href="/admin/plan" active={is("/admin/plan") || pathname === "/admin"} label="Plan" />
        <NavItem
          href="/admin/uploads"
          active={is("/admin/uploads")}
          label="Uploads"
          right={uploadsCount > 0 ? <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[var(--color-warm-mute)] bg-[var(--color-warm-surface-2)] px-1.5 py-0.5 rounded-sm">{uploadsCount}</span> : null}
        />
        <NavItem
          href="/admin/ask-dad"
          active={is("/admin/ask-dad")}
          label="Ask Dad"
          right={
            pendingQuestions > 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] animate-pulse" aria-label={`${pendingQuestions} pending`} />
            ) : null
          }
        />
      </NavGroup>

      <NavGroup label="Longer view">
        <DisabledItem label="Month" />
        <DisabledItem label="Archive" />
        <DisabledItem label="Photos" />
      </NavGroup>

      <NavGroup label="Setup">
        <DisabledItem label="Templates" />
        <DisabledItem label="Settings" />
      </NavGroup>

      <div className="mt-auto pt-6 border-t border-[var(--color-line)] flex items-center justify-between font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
          Signed in as Dad
        </span>
        <button onClick={logout} className="hover:text-[var(--color-red)] transition-colors">
          Log out
        </button>
      </div>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-dim)] px-3 mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItem({ href, active, label, right }: { href: string; active: boolean; label: string; right?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2.5 rounded-sm text-[0.88rem] transition-colors ${
        active
          ? "bg-[var(--color-warm-surface-3)] text-[var(--color-bone)] border-l-2 border-[var(--color-red)] pl-[calc(0.75rem-2px)]"
          : "text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)]"
      }`}
    >
      <span>{label}</span>
      {right}
    </Link>
  );
}

function DisabledItem({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between px-3 py-2.5 rounded-sm text-[0.88rem] text-[var(--color-warm-dim)] cursor-not-allowed">
      <span>{label}</span>
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-wider">soon</span>
    </span>
  );
}
