"use client";

import { useAllDrafts } from "./draft-context";

type Props = {
  title?: string;
  fields: { path: string; label: string }[];
};

export default function LessonScaffoldSidebar({ title = "Your notes", fields }: Props) {
  const drafts = useAllDrafts();
  const visible = fields.filter((f) => (drafts[f.path] ?? "").trim().length > 0);

  return (
    <aside className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 lg:sticky lg:top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-4">
        {title}
      </div>
      {visible.length === 0 ? (
        <p className="font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-warm-mute)] leading-snug">
          Nothing here yet — your earlier notes will show here while you write.
        </p>
      ) : (
        <dl className="flex flex-col gap-4">
          {visible.map((f) => (
            <div key={f.path}>
              <dt className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
                {f.label}
              </dt>
              <dd className="font-[family-name:var(--font-fraunces)] italic text-[0.95rem] leading-snug text-[var(--color-warm-bone)] whitespace-pre-wrap">
                {drafts[f.path]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
