"use client";

import { useMemo } from "react";
import { useDraftField } from "./draft-context";
import SaveIndicator from "./save-indicator";

type Props = {
  fieldPath: string;
  label: string;
  placeholder?: string;
  helpText?: string;
};

export default function LessonURLInput({ fieldPath, label, placeholder, helpText }: Props) {
  const { value, setValue, flush, status, savedAt } = useDraftField(fieldPath);

  const youtubeId = useMemo(() => extractYoutubeId(value), [value]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label
          htmlFor={`lu-${fieldPath}`}
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]"
        >
          {label}
        </label>
        <SaveIndicator status={status} savedAt={savedAt} />
      </div>
      {helpText && (
        <p className="font-[family-name:var(--font-fraunces)] italic text-[0.9rem] text-[var(--color-warm-bone)] leading-snug">
          {helpText}
        </p>
      )}
      <input
        id={`lu-${fieldPath}`}
        type="url"
        value={value}
        placeholder={placeholder ?? "https://www.youtube.com/watch?v=…"}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
        className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.85rem] focus:outline-none focus:border-[var(--color-red)] break-all"
      />
      {youtubeId && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video rounded overflow-hidden bg-[var(--color-warm-surface-3)] group"
          style={{
            backgroundImage: `url(https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,14,12,0.65)] via-transparent to-[rgba(15,14,12,0.2)] group-hover:from-[rgba(15,14,12,0.8)] transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[64px] h-[64px] rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.18)] group-hover:scale-110 transition-transform">
            <span className="block w-0 h-0 border-l-[14px] border-l-[var(--color-bone)] border-y-[8px] border-y-transparent ml-1" />
          </div>
          <span className="absolute top-2 left-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-bone)] bg-[rgba(15,14,12,0.85)] backdrop-blur-sm px-2 py-1 rounded">
            Opens in YouTube
          </span>
        </a>
      )}
      {value.length > 0 && !youtubeId && (
        <p className="font-[family-name:var(--font-fraunces)] italic text-[0.85rem] text-[var(--color-amber)]">
          That doesn&apos;t look like a YouTube link yet. Paste the full URL — it should have <code className="not-italic font-[family-name:var(--font-jetbrains)] text-[0.75rem]">youtube.com/watch?v=</code> or <code className="not-italic font-[family-name:var(--font-jetbrains)] text-[0.75rem]">youtu.be/</code> in it.
        </p>
      )}
    </div>
  );
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:\W|$)/);
  return m ? m[1] : null;
}
