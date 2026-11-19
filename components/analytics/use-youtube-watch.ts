"use client";

import { useEffect, type RefObject } from "react";
import { track } from "@/lib/analytics/client";

/**
 * Counts plays and watch time for a YouTube embed. The embed has to be loaded
 * with enablejsapi=1 (ytEmbedUrl does that). We ask the player to tell us
 * when it starts and stops, and it answers with postMessage.
 *
 * If YouTube ever changes those messages, this just stops counting. It can't
 * break the video.
 */
export function useYouTubeWatch(frame: RefObject<HTMLIFrameElement | null>, youtubeId: string, title: string) {
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const key = `yt:${youtubeId}`;
    let heard = false;
    let started = false;
    let playingSince = 0;

    const bank = () => {
      if (!playingSince) return;
      const secs = Math.round((Date.now() - playingSince) / 1000);
      playingSince = 0;
      if (secs >= 1) track({ t: "watch", k: key, l: title, d: "time", n: secs });
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== el.contentWindow || typeof e.data !== "string") return;
      let state: unknown;
      try {
        const msg = JSON.parse(e.data);
        heard = true;
        state = msg?.event === "onStateChange" ? msg.info : msg?.info?.playerState;
      } catch {
        return;
      }
      if (state === 1) {
        if (!started) {
          started = true;
          track({ t: "watch", k: key, l: title, d: "start" });
        }
        if (!playingSince) playingSince = Date.now();
      } else if (state === 2 || state === 0) {
        bank();
        if (state === 0) track({ t: "watch", k: key, l: title, d: "complete" });
      }
    };

    // The player only talks once it has been told someone is listening, and
    // it ignores that until it has loaded. So ask a few times.
    const ask = () => {
      try {
        el.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        el.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id: 1, channel: "widget" }), "*");
      } catch {
        // frame not ready
      }
    };
    let tries = 0;
    const poll = setInterval(() => {
      if (heard || ++tries > 20) clearInterval(poll);
      else ask();
    }, 500);
    el.addEventListener("load", ask);
    window.addEventListener("message", onMessage);
    const onHide = () => document.visibilityState === "hidden" && bank();
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(poll);
      el.removeEventListener("load", ask);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onHide);
      bank();
    };
  }, [frame, youtubeId, title]);
}
