import Link from "next/link";
import type { Task } from "@/lib/data";
import CheckToggle from "./check-toggle";

type Props = { task: Task };

export default function TaskCard({ task }: Props) {
  const done = !!task.completion;
  const isCheck = task.completion_type === "check";

  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] gap-5 items-center py-5 px-6 rounded border transition-all ${
        done
          ? "bg-[var(--color-warm-bg)] border-[var(--color-line)] opacity-75"
          : "bg-[var(--color-warm-surface)] border-[var(--color-line)] hover:bg-[var(--color-warm-surface-hover)] hover:border-[var(--color-line-strong)]"
      }`}
    >
      {isCheck ? (
        <CheckToggle taskId={task.id} done={done} />
      ) : (
        <StaticDot done={done} />
      )}

      <div className="min-w-0">
        {task.subject && (
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1.5">
            {task.subject}
          </div>
        )}
        <h4
          className={`font-[family-name:var(--font-fraunces)] font-semibold text-[1.15rem] leading-snug tracking-[-0.01em] mb-1 ${
            done ? "line-through decoration-[var(--color-warm-mute)] text-[var(--color-warm-mute)]" : ""
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p
            className={`text-sm leading-relaxed max-w-[55ch] ${
              done ? "text-[var(--color-warm-mute)] opacity-60" : "text-[var(--color-warm-mute)]"
            }`}
          >
            {task.description}
          </p>
        )}
        {task.reflection_prompt && !done && (
          <div className="mt-3 pt-3 border-t border-[var(--color-line)] text-sm italic leading-snug text-[var(--color-warm-bone)]">
            <span className="not-italic font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-amber)] mr-2">
              Reflect
            </span>
            {task.reflection_prompt}
          </div>
        )}
        {task.link && !done && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 pb-0.5 text-[var(--color-red-soft)] text-[0.8rem] border-b border-transparent hover:border-[var(--color-red-soft)] transition-colors"
          >
            Open <span>↗</span>
          </a>
        )}
      </div>

      <Action task={task} done={done} />
    </div>
  );
}

function StaticDot({ done }: { done: boolean }) {
  return (
    <div
      aria-hidden
      className={`rounded-full border-[1.5px] flex items-center justify-center shrink-0 w-[22px] h-[22px] ${
        done ? "bg-[var(--color-red)] border-[var(--color-red)]" : "border-[var(--color-line-strong)]"
      }`}
    >
      {done && (
        <span className="block w-[10px] h-[6px] border-l-[1.5px] border-b-[1.5px] border-[var(--color-bone)] -translate-y-[1px] -rotate-45" />
      )}
    </div>
  );
}

function Action({ task, done }: { task: Task; done: boolean }) {
  if (task.completion_type === "check") return null;
  if (done) return <DoneBadge />;

  if (task.completion_type === "photo") {
    return <ActionLink href={`/me/upload/${task.id}`} variant="photo" label="Upload" />;
  }
  if (task.completion_type === "reflection") {
    return <ActionLink href={`/me/reflect/${task.id}`} variant="reflect" label="Reflect" />;
  }
  return <ActionLink href={`/me/upload/${task.id}`} variant="both" label="Upload + Reflect" />;
}

function ActionLink({
  href,
  variant,
  label,
}: {
  href: string;
  variant: "photo" | "reflect" | "both";
  label: string;
}) {
  const base =
    "inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm whitespace-nowrap transition-colors";
  const variantClass =
    variant === "photo"
      ? "border border-[var(--color-line-strong)] text-[var(--color-bone)] hover:bg-[var(--color-red)] hover:border-[var(--color-red)]"
      : variant === "reflect"
      ? "border border-[var(--color-amber)] text-[var(--color-amber)] hover:bg-[var(--color-amber)] hover:text-[var(--color-warm-bg)]"
      : "bg-[var(--color-red)] border border-[var(--color-red)] text-[var(--color-bone)] hover:bg-[var(--color-red-soft)] hover:border-[var(--color-red-soft)]";
  return (
    <Link href={href} className={`${base} ${variantClass}`}>
      {(variant === "photo" || variant === "both") && <CameraIcon />}
      {(variant === "reflect" || variant === "both") && <PencilIcon />}
      {label}
    </Link>
  );
}

function DoneBadge() {
  return (
    <span className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.15em] px-4 py-2.5 rounded-sm whitespace-nowrap border border-[var(--color-line)] text-[var(--color-warm-mute)]">
      <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-[var(--color-green)] rotate-45 translate-y-[-1px]" />
      Done
    </span>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <rect x="1.5" y="4.5" width="13" height="9" rx="1" />
      <circle cx="8" cy="9" r="2.4" />
      <path d="M5.5 4.5 V3 h5 v1.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M11.5 2.5l2 2-8.5 8.5H2.5v-2.5z" />
      <path d="M10.5 3.5l2 2" />
    </svg>
  );
}
