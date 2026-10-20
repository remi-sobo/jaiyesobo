"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ytEmbedUrl } from "./episode-player";

/**
 * A branded thumbnail (a real frame from the video) that opens the episode
 * in a pop-up player. Close with the X, Escape, or tapping outside.
 */
export default function VideoPopout({
  youtubeId,
  title,
  label,
  href,
  compact = false,
}: {
  youtubeId: string;
  title: string;
  /** Small kicker over the thumbnail, like "EP. 02 · On The Court". */
  label: string;
  /** Where "Read the article" goes. */
  href: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play video: ${title}`}
        className="group relative block aspect-video w-full overflow-hidden border border-[var(--color-line-strong)] bg-[var(--color-black)] text-left"
      >
        <Image
          src={thumb}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          onError={() => setThumb(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`)}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] [filter:contrast(1.05)_saturate(1.05)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,10,0.92)_0%,rgba(10,10,10,0.25)_55%,rgba(10,10,10,0.1)_100%)]" />
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--color-red)]" />
        <div className="absolute left-3 top-3 bg-[var(--color-red)] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-black)]">
          {label}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-red)] shadow-[0_0_40px_rgba(230,57,70,0.55)] transition-transform duration-300 group-hover:scale-110">
            <span aria-hidden className="ml-1 h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-[var(--color-black)]" />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div
            className={`font-[family-name:var(--font-fraunces)] font-black leading-[1.05] tracking-[-0.02em] text-[var(--color-bone)] ${
              compact ? "text-[1.05rem]" : "text-[clamp(1.15rem,2.6vw,1.6rem)]"
            }`}
          >
            {title}
          </div>
          <div className="mt-1 font-[family-name:var(--font-jetbrains)] text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">Tap to watch</div>
        </div>
      </button>
      {open ? <VideoModal youtubeId={youtubeId} title={title} href={href} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VideoModal({ youtubeId, title, href, onClose }: { youtubeId: string; title: string; href: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-[1000px]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Link
            href={href}
            className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-red)] hover:text-[var(--color-bone)]"
          >
            Read the article ↗
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-line-strong)] bg-[var(--color-black)] text-[var(--color-bone)] hover:border-[var(--color-red)]"
          >
            ✕
          </button>
        </div>
        <div className="relative aspect-video w-full border border-[var(--color-line-strong)] bg-black">
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={ytEmbedUrl(youtubeId, { autoplay: true })}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
