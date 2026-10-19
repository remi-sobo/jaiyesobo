"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShareCard, type PredictionViewProps } from "./prediction-view";

/** Fixed export width. The card lays itself out from its own width, so every device gets the same image. */
const EXPORT_WIDTH = 1400;

/**
 * Renders a second copy of the share card off screen at a fixed width, then
 * snapshots it with html-to-image. The copy only exists while exporting.
 */
export default function DownloadImageButton(props: PredictionViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busy) return;
    let cancelled = false;
    (async () => {
      try {
        const { toPng } = await import("html-to-image");
        await document.fonts.ready;
        // Two frames so layout settles before we copy it.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const node = nodeRef.current;
        if (!node || cancelled) return;
        const url = await toPng(node, {
          width: EXPORT_WIDTH,
          height: node.scrollHeight,
          pixelRatio: 2,
          backgroundColor: "#0a0a0a",
          cacheBust: true,
          style: { transform: "none", left: "0", top: "0" },
        });
        const a = document.createElement("a");
        a.href = url;
        a.download = `${props.ownerName.toLowerCase()}-${props.season}-nba-predictions.png`;
        a.click();
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Couldn't make the image. Try again?");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [busy, props.ownerName, props.season]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError(null);
          setBusy(true);
        }}
        className="inline-flex min-h-12 items-center gap-3 bg-[var(--color-red)] px-[26px] py-[15px] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-black)] transition-colors duration-300 hover:bg-[var(--color-bone)] disabled:opacity-60"
      >
        {busy ? "Making your image…" : "Download as image"}
      </button>
      {error ? <p className="text-[0.8rem] text-[var(--color-red-soft)]">{error}</p> : null}
      {busy &&
        createPortal(
          <div
            aria-hidden
            style={{ position: "fixed", top: 0, left: -EXPORT_WIDTH * 3, width: EXPORT_WIDTH, pointerEvents: "none" }}
          >
            <div
              ref={nodeRef}
              style={{ width: EXPORT_WIDTH, background: "#0a0a0a", color: "#F5F1EA", padding: "64px 56px 56px" }}
            >
              <ShareCard {...props} />
              <div
                style={{ marginTop: 40, textAlign: "center" }}
                className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] uppercase tracking-[0.3em] text-[var(--color-mute)]"
              >
                jaiyesobo.com/predictions
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
