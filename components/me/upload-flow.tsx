"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TaskLite = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  reflection_prompt: string | null;
  completion_type: "photo" | "photo_and_reflection";
};

type Props = {
  task: TaskLite;
  streak: number;
};

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

type Phase = "empty" | "preview" | "uploading" | "success" | "error";

export default function UploadFlow({ task, streak }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const requiresReflection = task.completion_type === "photo_and_reflection";
  const [files, setFiles] = useState<File[]>([]);
  const [reflection, setReflection] = useState("");
  const [phase, setPhase] = useState<Phase>("empty");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previews = useMemo(
    () =>
      files.map((f) => ({
        file: f,
        url: URL.createObjectURL(f),
      })),
    [files]
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setInlineError(null);
      const arr = Array.from(incoming);
      for (const f of arr) {
        if (!f.type.startsWith("image/")) {
          setInlineError("That's not a picture. Pick a different file.");
          return;
        }
        if (f.size > MAX_BYTES) {
          setInlineError("That file's too big. Take a smaller photo.");
          return;
        }
      }
      setFiles((prev) => {
        const combined = [...prev, ...arr].slice(0, MAX_FILES);
        return combined;
      });
      setPhase("preview");
    },
    []
  );

  const openPicker = () => inputRef.current?.click();

  const removeFile = (i: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length === 0) setPhase("empty");
      return next;
    });
  };

  const canSend =
    files.length > 0 &&
    (!requiresReflection || reflection.trim().length > 0) &&
    phase !== "uploading";

  async function send() {
    if (!canSend) return;
    setPhase("uploading");
    setInlineError(null);
    try {
      const form = new FormData();
      form.append("taskId", task.id);
      for (const f of files) form.append("files", f);
      if (reflection.trim()) form.append("reflection", reflection.trim());
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      setPhase("success");
    } catch (err) {
      console.error(err);
      setPhase("error");
    }
  }

  function goHome() {
    router.push("/me");
    router.refresh();
  }

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <BackBar />

      <TaskBanner task={task} />

      {phase === "empty" && (
        <EmptyState
          onClickPicker={openPicker}
          onDragState={setIsDragging}
          isDragging={isDragging}
          onFiles={addFiles}
          inlineError={inlineError}
        />
      )}

      {(phase === "preview" || phase === "uploading" || phase === "error") && (
        <PreviewState
          previews={previews}
          onRemove={removeFile}
          onAddMore={openPicker}
          reflection={reflection}
          onReflection={setReflection}
          requiresReflection={requiresReflection}
          reflectionPrompt={task.reflection_prompt}
          canAddMore={files.length < MAX_FILES}
          phase={phase}
          onSend={send}
          onReset={() => {
            setFiles([]);
            setReflection("");
            setPhase("empty");
            setInlineError(null);
          }}
          canSend={canSend}
          inlineError={inlineError}
        />
      )}

      {phase === "success" && <SuccessState streak={streak} photoCount={files.length} onDone={goHome} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </main>
  );
}

function BackBar() {
  return (
    <div className="flex justify-between items-center mb-10 pb-6 border-b border-[var(--color-line)]">
      <Link
        href="/me"
        className="flex items-center gap-2 text-[var(--color-warm-mute)] hover:text-[var(--color-red)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] transition-colors"
      >
        <span>←</span> Back to Today
      </Link>
      <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] animate-pulse" />
        Upload · Step 1 of 2
      </div>
    </div>
  );
}

function TaskBanner({ task }: { task: TaskLite }) {
  const accent = accentForSubject(task.subject);
  return (
    <div
      className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded px-8 py-7 mb-8"
      style={{ borderLeftColor: accent, borderLeftWidth: "4px" }}
    >
      <div
        className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] mb-3"
        style={{ color: accent }}
      >
        {task.subject || "Task"} · upload for Dad
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em] mb-2">
        {task.title}
      </h1>
      {task.description && (
        <p className="text-[var(--color-warm-bone)] leading-relaxed max-w-[60ch]">{task.description}</p>
      )}
    </div>
  );
}

function EmptyState({
  onClickPicker,
  onDragState,
  isDragging,
  onFiles,
  inlineError,
}: {
  onClickPicker: () => void;
  onDragState: (v: boolean) => void;
  isDragging: boolean;
  onFiles: (files: FileList | File[]) => void;
  inlineError: string | null;
}) {
  return (
    <>
      <div
        onClick={onClickPicker}
        onDragOver={(e) => {
          e.preventDefault();
          onDragState(true);
        }}
        onDragLeave={() => onDragState(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragState(false);
          if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
        }}
        className={`bg-[var(--color-warm-surface)] border-2 border-dashed rounded-md py-16 px-8 text-center cursor-pointer transition-all relative overflow-hidden ${
          isDragging
            ? "border-[var(--color-red)] bg-[var(--color-warm-surface-2)]"
            : "border-[var(--color-line-strong)] hover:border-[var(--color-red)] hover:bg-[var(--color-warm-surface-2)]"
        }`}
      >
        <div className="w-[72px] h-[72px] mx-auto mb-6 text-[var(--color-warm-mute)]">
          <svg viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full">
            <rect x="10" y="18" width="52" height="42" rx="3" />
            <circle cx="24" cy="34" r="5" />
            <path d="M14 60 L30 44 L42 52 L58 36 L62 40" />
          </svg>
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.65rem] tracking-[-0.01em] mb-2">
          Drop your <span className="italic font-normal text-[var(--color-red)]">photo</span> here.
        </h2>
        <p className="text-[var(--color-warm-mute)] max-w-[40ch] mx-auto mb-8 leading-relaxed">
          Or tap to pick from your camera. Up to <strong className="text-[var(--color-warm-bone)]">3 photos</strong>.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClickPicker();
          }}
          className="inline-flex items-center gap-2 bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
        >
          Pick a photo
        </button>
      </div>
      {inlineError && (
        <div className="mt-4 px-5 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] font-[family-name:var(--font-fraunces)] italic">
          {inlineError}
        </div>
      )}
      <HelpBar />
    </>
  );
}

function HelpBar() {
  return (
    <div className="mt-5 px-5 py-4 bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded flex items-start gap-4 text-[var(--color-warm-bone)]">
      <div className="w-6 h-6 rounded-full bg-[var(--color-warm-surface-3)] text-[var(--color-red)] flex items-center justify-center shrink-0 font-[family-name:var(--font-fraunces)] font-semibold text-xs mt-0.5">
        ?
      </div>
      <div className="text-sm leading-relaxed">
        <strong className="block mb-0.5 text-[var(--color-bone)] font-[family-name:var(--font-fraunces)] font-medium">
          Need to get a photo on here first?
        </strong>
        Take it with your camera, then come back. Or ask Dad to AirDrop it over.
      </div>
    </div>
  );
}

function PreviewState({
  previews,
  onRemove,
  onAddMore,
  reflection,
  onReflection,
  requiresReflection,
  reflectionPrompt,
  canAddMore,
  phase,
  onSend,
  onReset,
  canSend,
  inlineError,
}: {
  previews: { file: File; url: string }[];
  onRemove: (i: number) => void;
  onAddMore: () => void;
  reflection: string;
  onReflection: (s: string) => void;
  requiresReflection: boolean;
  reflectionPrompt: string | null;
  canAddMore: boolean;
  phase: Phase;
  onSend: () => void;
  onReset: () => void;
  canSend: boolean;
  inlineError: string | null;
}) {
  const uploading = phase === "uploading";
  const errored = phase === "error";

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 mb-8">
      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md p-6 min-h-[420px] flex flex-col gap-4">
        {previews.length === 1 ? (
          <div className="relative flex-1 flex items-center justify-center bg-[var(--color-warm-bg)] rounded overflow-hidden min-h-[360px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previews[0].url} alt="Preview" className="max-w-full max-h-[420px] object-contain" />
            <button
              type="button"
              onClick={() => onRemove(0)}
              disabled={uploading}
              className="absolute top-3 right-3 bg-[rgba(10,10,10,0.85)] backdrop-blur text-[var(--color-warm-bone)] font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 rounded hover:text-[var(--color-red)] transition-colors"
            >
              Remove
            </button>
            <div className="absolute bottom-3 left-3 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.15em] bg-[rgba(10,10,10,0.85)] backdrop-blur px-3 py-1.5 rounded text-[var(--color-warm-bone)]">
              {formatSize(previews[0].file.size)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square bg-[var(--color-warm-bg)] rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={uploading}
                  className="absolute top-2 right-2 bg-[rgba(10,10,10,0.9)] text-[var(--color-warm-bone)] text-xs w-7 h-7 rounded-full hover:text-[var(--color-red)] transition-colors"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {canAddMore && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={uploading}
            className="self-start font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
          >
            + Add another photo ({previews.length}/{MAX_FILES})
          </button>
        )}
      </div>

      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] pb-4 border-b border-[var(--color-line)]">
          <span className="w-6 h-px bg-[var(--color-red)]" />
          Send this to Dad?
        </div>

        <div>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.35rem] tracking-[-0.01em] leading-snug">
            Ready to <span className="italic font-normal text-[var(--color-red)]">send</span>?
          </div>
          <p className="text-sm text-[var(--color-warm-mute)] leading-relaxed mt-2">
            {requiresReflection
              ? "Your photo and reflection go straight to Dad's inbox."
              : "Your photo lands in Dad's inbox. This marks the task as done."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            {requiresReflection ? "Reflection" : "Note for Dad"}
            {!requiresReflection && (
              <span className="text-[var(--color-warm-dim)] normal-case tracking-normal ml-2 text-[0.7rem]">optional</span>
            )}
          </label>
          {requiresReflection && reflectionPrompt && (
            <div className="font-[family-name:var(--font-fraunces)] italic text-sm text-[var(--color-warm-bone)] leading-snug">
              {reflectionPrompt}
            </div>
          )}
          <textarea
            value={reflection}
            onChange={(e) => onReflection(e.target.value)}
            disabled={uploading}
            placeholder={
              requiresReflection
                ? "Write what you learned..."
                : "Say something about it..."
            }
            className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 font-[family-name:var(--font-fraunces)] italic text-[0.95rem] leading-snug text-[var(--color-bone)] placeholder:text-[var(--color-warm-dim)] placeholder:italic focus:outline-none focus:border-[var(--color-red)] min-h-[70px] resize-y"
          />
          {requiresReflection && (
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-warm-mute)] tracking-wider">
              {reflectionEncouragement(reflection)}
            </div>
          )}
        </div>

        {(errored || inlineError) && (
          <div className="px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm font-[family-name:var(--font-fraunces)] italic">
            {inlineError ?? "Something went wrong. Try again, or ask Dad."}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto pt-2">
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Spinner /> Sending...
              </>
            ) : (
              <>Send to Dad <span>→</span></>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={uploading}
            className="bg-transparent border border-[var(--color-line-strong)] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] hover:border-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] py-3 rounded-sm transition-colors"
          >
            Pick different photos
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ streak, photoCount, onDone }: { streak: number; photoCount: number; onDone: () => void }) {
  return (
    <div className="relative bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded-md px-10 py-16 text-center overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none [background:radial-gradient(circle,rgba(230,57,70,0.12),transparent_60%)]" />
      <div className="w-24 h-24 mx-auto mb-8 relative z-[2] rounded-full bg-[var(--color-red)] flex items-center justify-center shadow-[0_0_0_8px_rgba(230,57,70,0.12),0_20px_40px_-10px_rgba(230,57,70,0.3)]">
        <span className="w-9 h-5 border-l-[3px] border-b-[3px] border-[var(--color-bone)] rotate-[-45deg] translate-x-[3px] translate-y-[-4px]" />
      </div>
      <h1 className="relative z-[2] font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] mb-4">
        Sent to <span className="italic font-normal text-[var(--color-red)]">Dad.</span>
      </h1>
      <p className="relative z-[2] font-[family-name:var(--font-fraunces)] text-[1.2rem] leading-relaxed text-[var(--color-warm-bone)] max-w-[44ch] mx-auto mb-10">
        {photoCount === 1 ? "That's one photo in Dad's inbox." : `That's ${photoCount} photos in Dad's inbox.`}{" "}
        <em className="italic text-[var(--color-red)]">Nice work.</em>
      </p>
      <div className="relative z-[2] inline-flex justify-center gap-10 px-8 py-6 bg-[var(--color-warm-surface-2)] rounded mb-10">
        <div className="flex flex-col items-center">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
            Streak
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-black text-3xl tracking-tight">
            <span className="italic font-normal text-[var(--color-red)] mr-1">★</span>
            {streak}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-warm-mute)] mt-1">
            days
          </div>
        </div>
      </div>
      <div className="relative z-[2]">
        <button
          type="button"
          onClick={onDone}
          className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
        >
          Back to Today
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function reflectionEncouragement(text: string): string {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  if (sentences === 0) return "Start with one sentence.";
  if (sentences === 1) return "1 sentence. Keep going.";
  if (sentences < 4) return `${sentences} sentences so far. Keep going.`;
  return `${sentences} sentences. Nice.`;
}

function accentForSubject(subject: string | null): string {
  const clean = subject?.split("·")[0].trim();
  switch (clean) {
    case "Math":
      return "#f4a261";
    case "Reading":
      return "#6b9bd2";
    case "Writing":
      return "#a084dc";
    case "Science":
      return "#4ade80";
    case "Ball":
      return "#E63946";
    default:
      return "#8a8578";
  }
}
