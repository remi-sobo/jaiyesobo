"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtext?: string;
};

export default function ShareModal({ open, onClose, url, title, subtext }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url, title, text: subtext });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  const tweetText = encodeURIComponent(`${title}${subtext ? " — " + subtext : ""}`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const sms = `sms:?&body=${encodeURIComponent(`${title} ${url}`)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.85)] backdrop-blur-sm flex items-center justify-center px-4 py-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-[var(--color-card)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-games-yellow)] rounded p-7"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl tracking-[-0.01em] leading-snug">
            Share your <span className="italic font-normal text-[var(--color-games-yellow)]">verdict.</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-mute)] hover:text-[var(--color-bone)] text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-[var(--color-mute)] mb-5">
          Drop this link in iMessage, Twitter, wherever. The card preview hits.
        </p>

        <div className="flex items-center gap-2 mb-5">
          <input
            type="text"
            readOnly
            value={url}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-[var(--color-off-black)] border border-[var(--color-line)] rounded px-3 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.75rem] text-[var(--color-bone)] focus:outline-none focus:border-[var(--color-red)]"
          />
          <button
            type="button"
            onClick={copy}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors whitespace-nowrap"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={nativeShare}
            className="border border-[var(--color-line)] rounded py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] hover:border-[var(--color-bone)] transition-colors"
          >
            Share
          </button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center border border-[var(--color-line)] rounded py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] hover:border-[var(--color-bone)] transition-colors"
          >
            Twitter
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center border border-[var(--color-line)] rounded py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] hover:border-[var(--color-bone)] transition-colors"
          >
            WhatsApp
          </a>
        </div>
        <a
          href={sms}
          className="block text-center mt-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)] hover:text-[var(--color-bone)] py-2"
        >
          iMessage / SMS →
        </a>
      </div>
    </div>
  );
}
