import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jaiye — Today",
  robots: { index: false, follow: false },
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] text-[var(--color-bone)] [background-image:radial-gradient(circle_at_10%_0%,rgba(230,57,70,0.05),transparent_40%),radial-gradient(circle_at_90%_100%,rgba(230,57,70,0.03),transparent_40%)]">
      {children}
    </div>
  );
}
