"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { flush, isTrackedPath, track } from "@/lib/analytics/client";

const READ_MARKS = [25, 50, 75, 100];

/**
 * Watches the public site and reports page views, time on page, clicks and
 * how far articles get read. Renders nothing. Spec: docs/ANALYTICS-SPEC.md.
 *
 * To count reading on a page, put `data-read="column:my-slug"` and
 * `data-read-label="The title"` on the article element.
 * To count a button, give it `data-track="what-it-does"`.
 */
export default function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);

  // Page view, time on page, and reading depth. Re-runs on every route change.
  useEffect(() => {
    if (!isTrackedPath(pathname)) return;

    track({ t: "pageview", p: pathname, r: first.current ? document.referrer : undefined });
    first.current = false;

    // Time the page was actually on screen.
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    const bank = (closing: boolean) => {
      if (since) {
        const secs = Math.round((Date.now() - since) / 1000);
        since = 0;
        if (secs >= 2) track({ t: "engage", p: pathname, n: Math.min(secs, 1800) });
      }
      if (closing) flush(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") bank(true);
      else since = Date.now();
    };
    const onPageHide = () => bank(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    // Reading depth, for articles that opt in with data-read.
    let stopReading = () => {};
    const article = document.querySelector<HTMLElement>("[data-read]");
    if (article) {
      const key = article.dataset.read!;
      const label = article.dataset.readLabel;
      let reached = -1;
      track({ t: "read", p: pathname, k: key, l: label, n: 0 });
      const measure = () => {
        const box = article.getBoundingClientRect();
        const total = box.height - window.innerHeight * 0.6;
        const done = total <= 0 ? 100 : Math.min(100, Math.max(0, (-box.top / total) * 100));
        for (const mark of READ_MARKS) {
          if (done >= mark && mark > reached) {
            reached = mark;
            track({ t: "read", p: pathname, k: key, l: label, n: mark });
          }
        }
        if (reached === 100) stopReading();
      };
      // Wait a moment so a page that opens already scrolled doesn't count as read.
      const start = setTimeout(() => {
        window.addEventListener("scroll", measure, { passive: true });
      }, 1500);
      stopReading = () => {
        clearTimeout(start);
        window.removeEventListener("scroll", measure);
      };
    }

    return () => {
      bank(false);
      stopReading();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [pathname]);

  // Clicks: every link, plus anything marked data-track.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const from = e.target as Element | null;
      const el = from?.closest?.<HTMLElement>("a[href], [data-track]");
      if (!el) return;
      // A whole card can be one link, so keep just the start of its text.
      const text = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
      const label = text.length > 60 ? `${text.slice(0, 57)}...` : text;
      const marked = el.dataset.track;
      if (marked) {
        track({ t: "click", k: marked, l: label, d: "button" });
        return;
      }
      const href = el.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.protocol === "mailto:" || url.protocol === "tel:") {
          track({ t: "click", k: url.protocol.replace(":", ""), l: label, d: "out" });
        } else if (url.host === window.location.host) {
          track({ t: "click", k: url.pathname, l: label, d: "in" });
        } else {
          track({ t: "click", k: url.host.replace(/^www\./, "") + url.pathname, l: label, d: "out" });
          flush(true); // the page may be about to go away
        }
      } catch {
        // not a real link
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
