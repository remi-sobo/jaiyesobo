"use client";

import { useRef } from "react";
import type { Chapter } from "@/lib/content/types";
import { Badge, SectionLabel } from "./type";

export function ytEmbedUrl(id: string, opts: { autoplay?: boolean } = {}) {
  // cc_load_policy=1 turns YouTube's captions on by default. enablejsapi lets the chapters seek.
  const q = new URLSearchParams({ rel: "0", playsinline: "1", cc_load_policy: "1", enablejsapi: "1", modestbranding: "1" });
  if (opts.autoplay) q.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${q.toString()}`;
}

function toSeconds(t: string) {
  return t.split(":").reduce((s, part) => s * 60 + Number(part), 0);
}

/** The episode video plus chapters you can tap to jump the video to that moment. */
export default function EpisodePlayer({ youtubeId, title, chapters }: { youtubeId: string; title: string; chapters: Chapter[] }) {
  const frame = useRef<HTMLIFrameElement>(null);

  function jump(time: string) {
    const win = frame.current?.contentWindow;
    if (!win) return;
    const send = (func: string, args: unknown[] = []) => win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    send("seekTo", [toSeconds(time), true]);
    send("playVideo");
    frame.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      <div className="mt-10 border border-[var(--color-line-strong)] bg-[var(--color-off-black)] p-2">
        <div className="relative aspect-video w-full">
          <iframe
            ref={frame}
            className="absolute inset-0 h-full w-full border-0"
            src={ytEmbedUrl(youtubeId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {chapters.length ? (
      <section id="chapters" className="mt-16 scroll-mt-24">
        <SectionLabel>Chapters</SectionLabel>
        <ul className="mt-6 list-none">
          {chapters.map((c) => (
            <li key={c.time} className="border-t border-[var(--color-line)]">
              <button
                type="button"
                onClick={() => jump(c.time)}
                className="grid w-full grid-cols-[minmax(0,68px)_minmax(0,1fr)] gap-4 py-4 text-left transition-colors hover:bg-[var(--color-off-black)]"
              >
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.75rem] tracking-[0.05em] text-[var(--color-red)]">▶ {c.time}</span>
                <span className="text-[1.05rem] leading-[1.7] text-pretty">
                  {c.segment && (
                    <>
                      <Badge>{c.segment}</Badge>{" "}
                    </>
                  )}
                  {c.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      ) : null}
    </>
  );
}
