"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import KidSwitcher from "./kid-switcher";
import type { Kid } from "@/lib/admin-context";

type Props = {
  uploadsCount: number;
  pendingQuestions: number;
  newFeedback: number;
  kids: Kid[];
  activeKidId: string;
  activeKidName: string;
};

export default function Sidebar({
  uploadsCount,
  pendingQuestions,
  newFeedback,
  kids,
  activeKidId,
  activeKidName,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await fetch("/api/auth/logout?scope=admin", { method: "POST" });
    router.replace("/admin/lock");
    router.refresh();
  }

  // Brand accent reflects active kid (red for Jaiye, pink for Kemi).
  const brandAccent = activeKidName.toLowerCase() === "kemi" ? "#C83C78" : "var(--color-red)";

  return (
    <>
    <MobileBar
      activeKidName={activeKidName}
      brandAccent={brandAccent}
      kids={kids}
      activeKidId={activeKidId}
      is={is}
      onLogout={logout}
    />
    <aside className="hidden md:flex w-60 shrink-0 bg-[var(--color-warm-surface)] border-r border-[var(--color-line)] px-5 py-8 flex-col gap-10 sticky top-0 h-screen">
      <div className="pb-6 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-xl tracking-tight">
          {activeKidName}
          <span className="italic font-normal" style={{ color: brandAccent }}>.</span>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mt-1 mb-3">
          Admin
        </div>
        {kids.length > 1 && (
          <KidSwitcher kids={kids} activeKidId={activeKidId} />
        )}
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
        <NavItem
          href="/admin/feedback"
          active={is("/admin/feedback")}
          label="Feedback"
          right={
            newFeedback > 0 ? (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-bone)] bg-[var(--color-red)] px-1.5 py-0.5 rounded-sm">
                {newFeedback}
              </span>
            ) : null
          }
        />
      </NavGroup>

      <NavGroup label="Season">
        <NavItem href="/admin/predictions" active={is("/admin/predictions")} label="NBA Predictions" />
      </NavGroup>

      <NavGroup label="System">
        <NavItem href="/admin/setup" active={is("/admin/setup")} label="Setup" />
      </NavGroup>

      {/* v2 sections (Month, Archive, Photos, Templates, Settings) removed for v1 launch. Restore from git history when ready to build. */}

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
    </>
  );
}

const MOBILE_LINKS = [
  { href: "/admin/plan", label: "Plan" },
  { href: "/admin/uploads", label: "Uploads" },
  { href: "/admin/ask-dad", label: "Ask Dad" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/predictions", label: "Predictions" },
  { href: "/admin/setup", label: "Setup" },
];

/** Phones and small tablets: a compact top bar instead of the 240px sidebar. */
function MobileBar({
  activeKidName,
  brandAccent,
  kids,
  activeKidId,
  is,
  onLogout,
}: {
  activeKidName: string;
  brandAccent: string;
  kids: Kid[];
  activeKidId: string;
  is: (href: string) => boolean;
  onLogout: () => void;
}) {
  return (
    <div className="md:hidden border-b border-[var(--color-line)] bg-[var(--color-warm-surface)] px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-[family-name:var(--font-fraunces)] font-black text-lg tracking-tight">
          {activeKidName}
          <span className="italic font-normal" style={{ color: brandAccent }}>.</span>
          <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-normal uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
            Admin
          </span>
        </div>
        <button
          onClick={onLogout}
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-red)]"
        >
          Log out
        </button>
      </div>
      {kids.length > 1 && (
        <div className="mt-3">
          <KidSwitcher kids={kids} activeKidId={activeKidId} />
        </div>
      )}
      <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-2">
        {MOBILE_LINKS.map((l) => {
          const active = is(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 px-3 py-2 text-[0.85rem] border-b-2 ${
                active ? "border-[var(--color-red)] text-[var(--color-bone)]" : "border-transparent text-[var(--color-warm-mute)]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
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

