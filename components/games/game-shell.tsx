import Link from "next/link";

type Props = {
  children: React.ReactNode;
  showFooter?: boolean;
  /** Optional pulsing yellow dot indicator at the top of the shell, e.g. "Live today". */
  liveLabel?: string;
};

export default function GameShell({ children, showFooter = true, liveLabel }: Props) {
  return (
    <div className="min-h-screen bg-[var(--color-black)] text-[var(--color-bone)] flex flex-col">
      <div className="h-1 bg-gradient-to-r from-[var(--color-red)] via-[var(--color-games-yellow)] to-[var(--color-games-green)]" />

      {liveLabel && (
        <div className="border-b border-[var(--color-line)] px-6 py-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-games-yellow)] animate-pulse" />
          {liveLabel}
        </div>
      )}

      <main className="flex-1">{children}</main>

      {showFooter && (
        <footer className="border-t border-[var(--color-line)] px-6 py-8 mt-12">
          <div className="max-w-[900px] mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
            <div>
              Curated by <Link href="/about" className="text-[var(--color-bone)] hover:text-[var(--color-red)] transition-colors">Jaiye Sobo</Link>, age 8 · A father-son project from East Palo Alto
            </div>
            <Link href="/games" className="hover:text-[var(--color-red)] transition-colors">
              ← All games
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
