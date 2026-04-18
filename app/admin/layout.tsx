import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jaiye · Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] text-[var(--color-bone)]">
      {children}
    </div>
  );
}
