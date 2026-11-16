"use client";

import type { WireBatch, WireEvent } from "./types";

/**
 * The browser side of site analytics. `track()` queues an event and sends
 * the queue in small batches to /api/pulse. Everything here is wrapped so a
 * failure can never break the page it is watching.
 */

const ENDPOINT = "/api/pulse";
const VISITOR_KEY = "js_vid";
const SESSION_KEY = "js_sid";
const PRIVATE_AREAS = ["/admin", "/me", "/games-admin", "/api"];

let queue: WireEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let ids: { v: string; s: string; x: boolean } | null = null;

export function isTrackedPath(path: string) {
  return !PRIVATE_AREAS.some((a) => path === a || path.startsWith(`${a}/`));
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Old Safari. Random enough for counting visits.
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function stored(store: Storage, key: string) {
  let v = store.getItem(key);
  if (!v) {
    v = uuid();
    store.setItem(key, v);
  }
  return v;
}

/** True when the browser has asked sites not to track it. */
function askedNotToTrack() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

function getIds() {
  if (ids) return ids;
  try {
    const x = askedNotToTrack();
    const s = stored(sessionStorage, SESSION_KEY);
    // Asked not to be tracked: the id lasts only as long as this tab.
    const v = x ? s : stored(localStorage, VISITOR_KEY);
    ids = { v, s, x };
  } catch {
    // Storage blocked. Count this page load on its own.
    const one = uuid();
    ids = { v: one, s: one, x: true };
  }
  return ids;
}

/** Sends whatever is queued. `closing` uses sendBeacon so it survives the page going away. */
export function flush(closing = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  try {
    const { v, s, x } = getIds();
    const batch: WireBatch = { v, s, x, w: window.innerWidth, e: queue.splice(0, 25) };
    const body = JSON.stringify(batch);
    if (closing && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
    if (queue.length) flush(closing);
  } catch {
    queue = [];
  }
}

/** Queue one event. `p` defaults to the page you are on. */
export function track(event: Omit<WireEvent, "p"> & { p?: string }) {
  try {
    if (typeof window === "undefined") return;
    const p = event.p ?? window.location.pathname;
    if (!isTrackedPath(p)) return;
    queue.push({ ...event, p });
    if (queue.length >= 20) flush();
    else if (!timer) timer = setTimeout(() => flush(), 1500);
  } catch {
    // never let analytics break the page
  }
}
