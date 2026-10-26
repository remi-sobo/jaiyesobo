import Image from "next/image";

type Variant = "wordmark" | "wordmarkStacked" | "mark";
type Props = {
  variant?: Variant;
  /** Overall height of the lockup in px. Internal elements scale from this. */
  h?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Run It Back Picks lockup. Scoped to the /runitback brand surface (see
 * app/(public)/runitback/layout.tsx).
 *
 * The wordmark and stacked variants compose the symbol as an <Image> and
 * paint "RUN IT BACK" + "PICKS" as live text in Archivo (loaded via
 * next/font). Rendering those words as live markup is deliberate — the
 * handoff ships a wordmark SVG whose text is a live <text> element, and
 * when such an SVG is loaded through <img>, the browser doesn't apply the
 * host page's font context, so Archivo isn't available and the text
 * silently falls back to Arial Black. Live markup also lets the lockup
 * inherit the brand palette through the scoped CSS vars.
 *
 * The `mark` variant stays an <Image> because symbol_reversed.svg is
 * path-only (no text) and rasterizes identically everywhere.
 *
 * Sizing: `h` controls the overall lockup height; children size in `em`
 * off a container `fontSize` of `h`, so everything scales together.
 */
export function BrandLockup({ variant = "wordmark", h = 44, className, priority }: Props) {
  if (variant === "mark") {
    return (
      <Image
        src="/runitback-brand/symbol_reversed.svg"
        alt="Run It Back Picks mark"
        width={102}
        height={96}
        priority={priority}
        style={{ height: h, width: "auto" }}
        className={className}
      />
    );
  }

  if (variant === "wordmarkStacked") {
    return (
      <span
        role="img"
        aria-label="Run It Back Picks"
        style={{ fontSize: h }}
        className={`inline-flex flex-col items-center text-[color:var(--color-bone)] leading-none ${className ?? ""}`}
      >
        <Image
          aria-hidden
          src="/runitback-brand/symbol_reversed.svg"
          alt=""
          width={102}
          height={96}
          priority={priority}
          style={{ height: "1.4em", width: "auto" }}
        />
        <span
          className="mt-[0.3em] font-[family-name:var(--font-archivo)] italic font-black"
          style={{ fontSize: "1em", fontStretch: "112%" }}
        >
          RUN IT BACK
        </span>
        <span aria-hidden className="mt-[0.14em] flex items-center gap-[0.6em]">
          <span className="h-[0.05em] w-[0.9em] bg-[var(--color-red)]" />
          <span className="h-[0.05em] w-[0.9em] bg-[var(--color-red)]" />
        </span>
        <span
          className="mt-[0.1em] font-[family-name:var(--font-archivo)] font-semibold"
          style={{ fontSize: "0.42em", letterSpacing: "0.28em" }}
        >
          PICKS
        </span>
      </span>
    );
  }

  // Horizontal wordmark: mark + stacked text block (RUN IT BACK over divider over PICKS).
  return (
    <span
      role="img"
      aria-label="Run It Back Picks"
      style={{ fontSize: h }}
      className={`inline-flex items-center gap-[0.22em] text-[color:var(--color-bone)] align-middle ${className ?? ""}`}
    >
      <Image
        aria-hidden
        src="/runitback-brand/symbol_reversed.svg"
        alt=""
        width={102}
        height={96}
        priority={priority}
        style={{ height: "1em", width: "auto" }}
      />
      <span className="flex flex-col leading-none">
        <span
          className="font-[family-name:var(--font-archivo)] italic font-black"
          style={{ fontSize: "0.56em", fontStretch: "112%" }}
        >
          RUN IT BACK
        </span>
        <span aria-hidden className="my-[0.08em] block h-[0.045em] w-[0.5em] bg-[var(--color-red)]" />
        <span
          className="font-[family-name:var(--font-archivo)] font-semibold"
          style={{ fontSize: "0.23em", letterSpacing: "0.3em" }}
        >
          PICKS
        </span>
      </span>
    </span>
  );
}
