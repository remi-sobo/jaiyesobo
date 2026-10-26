import Image from "next/image";

type Variant = "wordmark" | "wordmarkStacked" | "mark";
type Props = { variant?: Variant; className?: string; priority?: boolean };

// Dimensions mirror the SVG viewBox so next/image preserves aspect ratio
// when the caller sets height-only via className.
const SOURCES: Record<Variant, { src: string; width: number; height: number; alt: string }> = {
  wordmark: {
    src: "/runitback-brand/wordmark_horizontal_dark.svg",
    width: 760,
    height: 180,
    alt: "Run It Back Picks",
  },
  wordmarkStacked: {
    src: "/runitback-brand/wordmark_stacked_dark.svg",
    width: 520,
    height: 420,
    alt: "Run It Back Picks",
  },
  mark: {
    src: "/runitback-brand/symbol_reversed.svg",
    width: 102,
    height: 96,
    alt: "Run It Back Picks mark",
  },
};

/**
 * Run It Back Picks lockup. Scoped to the /runitback brand surface (see
 * app/(public)/runitback/layout.tsx). The SVGs ship from
 * public/runitback-brand/, which came in with the brand v1 handoff.
 *
 *   <BrandLockup />                       // horizontal wordmark on dark
 *   <BrandLockup variant="wordmarkStacked" />
 *   <BrandLockup variant="mark" />        // reversed symbol alone
 *
 * The handoff says the mark is clear-space-sensitive. The caller sets size
 * via `className` (height/width Tailwind utilities), and `next/image`
 * preserves aspect ratio from the viewBox.
 */
export function BrandLockup({ variant = "wordmark", className, priority }: Props) {
  const spec = SOURCES[variant];
  return (
    <Image
      src={spec.src}
      alt={spec.alt}
      width={spec.width}
      height={spec.height}
      priority={priority}
      className={className}
    />
  );
}
