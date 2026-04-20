"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PhotoEntry } from "@/lib/photos";
import { SUBJECTS, type SubjectKey } from "@/lib/subjects";

type Props = { photos: PhotoEntry[] };

const FILTER_KEYS: (SubjectKey | "all")[] = ["all", "math", "reading", "writing", "science", "ball"];

export default function PhotosGrid({ photos }: Props) {
  const [filter, setFilter] = useState<SubjectKey | "all">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? photos : photos.filter((p) => p.subjectKey === filter)),
    [photos, filter]
  );

  const grouped = useMemo(() => {
    const m = new Map<string, PhotoEntry[]>();
    for (const p of filtered) {
      const arr = m.get(p.month) ?? [];
      arr.push(p);
      m.set(p.month, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
      else if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : Math.min(filtered.length - 1, i + 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, filtered.length]);

  if (photos.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="flex gap-2 mb-10 flex-wrap border-b border-[var(--color-line)] pb-2">
        {FILTER_KEYS.map((k) => {
          const count = k === "all" ? photos.length : photos.filter((p) => p.subjectKey === k).length;
          const label = k === "all" ? "All" : SUBJECTS[k].label;
          const active = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] px-3 py-2 rounded-sm transition-colors border-b-2 ${
                active
                  ? "text-[var(--color-bone)] border-[var(--color-red)]"
                  : "text-[var(--color-warm-mute)] border-transparent hover:text-[var(--color-bone)]"
              }`}
            >
              {label} <span className="text-[var(--color-warm-dim)] ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {grouped.length === 0 ? (
        <p className="text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
          Nothing in this category yet.
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          {grouped.map(([month, entries]) => (
            <section key={month}>
              <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-5">
                <span className="w-6 h-px bg-[var(--color-red)]" />
                {month} · {entries.length} photo{entries.length === 1 ? "" : "s"}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {entries.map((p) => {
                  const idxInFiltered = filtered.findIndex((f) => f === p);
                  return (
                    <button
                      key={`${p.completion_id}-${p.drive_id}`}
                      onClick={() => setLightboxIndex(idxInFiltered)}
                      className="relative aspect-square bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden group transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-red)]"
                      style={{
                        backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!p.thumbnail && (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-warm-dim)] text-xs font-[family-name:var(--font-jetbrains)]">
                          no preview
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,14,12,0.85)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
                          {p.subject ?? SUBJECTS[p.subjectKey].label}
                        </div>
                        <div className="font-[family-name:var(--font-fraunces)] text-[0.85rem] text-[var(--color-bone)] leading-snug line-clamp-2">
                          {p.task_title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <Lightbox
          photo={filtered[lightboxIndex]}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < filtered.length - 1}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)))}
          onNext={() => setLightboxIndex((i) => (i === null ? null : Math.min(filtered.length - 1, i + 1)))}
          index={lightboxIndex}
          total={filtered.length}
        />
      )}
    </>
  );
}

function Lightbox({
  photo,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
  index,
  total,
}: {
  photo: PhotoEntry;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  index: number;
  total: number;
}) {
  const fullUrl = photo.thumbnail ?? "";
  return (
    <div
      className="fixed inset-0 bg-[rgba(15,14,12,0.96)] z-50 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex justify-between items-center p-5 border-b border-[var(--color-line)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            {photo.subject ?? SUBJECTS[photo.subjectKey].label} · {new Date(photo.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <div className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--color-bone)] mt-0.5">
            {photo.task_title}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-[var(--color-warm-mute)]">
            {index + 1} / {total}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--color-warm-surface)] border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xl"
          aria-label="Previous photo"
        >
          ‹
        </button>
        {fullUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullUrl}
            alt={photo.task_title}
            className="max-w-full max-h-[82vh] object-contain"
          />
        ) : (
          <div className="text-[var(--color-warm-mute)] text-center">
            <p className="italic font-[family-name:var(--font-fraunces)] text-lg mb-1">Thumbnail expired.</p>
            <p className="text-sm">Drive thumbnails expire after ~1 hour — Dad&apos;s admin view has full access.</p>
          </div>
        )}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--color-warm-surface)] border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xl"
          aria-label="Next photo"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em] mb-3">
        Your <span className="italic font-normal text-[var(--color-red)]">photo wall</span> starts soon.
      </div>
      <p className="text-[var(--color-warm-bone)] max-w-[48ch] mx-auto leading-relaxed mb-8">
        It fills up when you upload your first piece of work. Every photo you send Dad lives here.
      </p>
      <Link
        href="/me"
        className="inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        ← Back to Today
      </Link>
    </div>
  );
}
