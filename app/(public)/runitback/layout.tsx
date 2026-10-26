/**
 * Scopes the Run It Back Picks brand v1 to this route group. The wrapper
 * `.runitback-brand` div redefines a handful of theme vars (accent, paper,
 * ink, surface, line, display font) inside its subtree only — see the
 * `.runitback-brand` block in app/globals.css. The rest of jaiyesobo.com
 * keeps Fraunces + the Vol. 02 palette.
 */
export default function RunItBackLayout({ children }: { children: React.ReactNode }) {
  return <div className="runitback-brand">{children}</div>;
}
