"use client";

import { useState, useTransition } from "react";
import type { CommentRow, Decision } from "@/lib/instagram/data";
import { decideAction } from "@/app/admin/replies/actions";

const mono = "font-[family-name:var(--font-jetbrains)]";

export default function ReplyPicker({ token, pending, done }: { token: string | null; pending: CommentRow[]; done: CommentRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {pending.map((c) => (
        <Card key={c.id} token={token} initial={c} />
      ))}
      {done.length > 0 && (
        <div className={`${mono} mt-6 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>Recently handled</div>
      )}
      {done.map((c) => (
        <Card key={c.id} token={token} initial={c} />
      ))}
    </div>
  );
}

const DONE_LABEL: Record<string, string> = { posted: "Posted", skipped: "Skipped", hidden: "Hidden on Instagram", left: "Left alone" };

function Card({ token, initial }: { token: string | null; initial: CommentRow }) {
  const [c, setC] = useState(initial);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const open = c.status === "open" || c.status === "flagged";

  function send(d: Decision) {
    setError(null);
    start(async () => {
      const r = await decideAction(token, c.id, d);
      if (r.ok) setC(r.row);
      else setError(r.error);
    });
  }

  return (
    <section className={`rounded-md border border-[var(--color-line)] bg-[var(--color-warm-surface)] p-4 ${open ? "" : "opacity-70"}`}>
      <div className="flex gap-3">
        {c.media_thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.media_thumb} alt="" className="h-16 w-12 shrink-0 rounded-sm object-cover" />
        ) : null}
        <div className="min-w-0">
          <div className={`${mono} text-[0.7rem] text-[var(--color-warm-mute)]`}>
            @{c.username}
            {c.media_permalink ? (
              <>
                {" · "}
                <a href={c.media_permalink} target="_blank" rel="noreferrer" className="underline">
                  post
                </a>
              </>
            ) : null}
          </div>
          <p className="mt-1 break-words text-[1rem] leading-snug">{c.text}</p>
        </div>
      </div>

      {c.status === "flagged" && (
        <p className="mt-3 rounded-sm bg-[var(--color-warm-surface-2)] px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--color-red)]">Flagged:</span> {c.flag_reason}
        </p>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-2">
          {c.status === "open" &&
            c.options.map((o, i) => (
              <button
                key={i}
                disabled={busy}
                onClick={() => send({ action: "post", choice: i })}
                className="rounded-md border border-[var(--color-line)] bg-[var(--color-warm-bg)] px-4 py-3 text-left text-[0.98rem] leading-snug active:bg-[var(--color-warm-surface-2)] disabled:opacity-50"
              >
                {o}
              </button>
            ))}

          {writing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={500}
                autoFocus
                placeholder="Write the reply"
                className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-warm-bg)] px-3 py-2 text-[1rem]"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy || !draft.trim()}
                  onClick={() => send({ action: "custom", text: draft })}
                  className="rounded-md bg-[var(--color-red)] px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Post it
                </button>
                <button onClick={() => setWriting(false)} className="px-3 py-2 text-sm text-[var(--color-warm-mute)]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`${mono} mt-1 flex flex-wrap gap-x-5 gap-y-2 text-[0.7rem] uppercase tracking-[0.12em] text-[var(--color-warm-mute)]`}>
              <button disabled={busy} onClick={() => setWriting(true)} className="py-1 hover:text-[var(--color-bone)]">
                Write my own
              </button>
              {c.status === "open" ? (
                <button disabled={busy} onClick={() => send({ action: "skip" })} className="py-1 hover:text-[var(--color-bone)]">
                  Skip
                </button>
              ) : (
                <button disabled={busy} onClick={() => send({ action: "leave" })} className="py-1 hover:text-[var(--color-bone)]">
                  Leave it
                </button>
              )}
              <button disabled={busy} onClick={() => send({ action: "hide" })} className="py-1 text-[var(--color-red)]">
                Hide on Instagram
              </button>
            </div>
          )}
        </div>
      )}

      {c.status === "posting" && <p className={`${mono} mt-3 text-[0.7rem] uppercase text-[var(--color-warm-mute)]`}>Posting...</p>}

      {!open && c.status !== "posting" && (
        <p className="mt-3 text-sm">
          <span className={`${mono} text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-green)]`}>{DONE_LABEL[c.status] ?? c.status}</span>
          {c.posted_text ? <span className="ml-2">&ldquo;{c.posted_text}&rdquo;</span> : null}
        </p>
      )}

      {busy && <p className={`${mono} mt-2 text-[0.65rem] uppercase text-[var(--color-warm-mute)]`}>Sending...</p>}
      {error && <p className="mt-2 text-sm text-[var(--color-red)]">{error}</p>}
    </section>
  );
}
