/** Shared shapes for site analytics. Spec: docs/ANALYTICS-SPEC.md. */

export const EVENT_TYPES = ["pageview", "engage", "click", "read", "watch"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Device = "phone" | "tablet" | "computer";

/** What the browser sends. Short keys keep the beacon small. */
export type WireEvent = {
  t: EventType;
  /** Page it happened on. */
  p: string;
  /** What it was about: a link, an article, a video. */
  k?: string;
  /** Words a person would recognise it by. */
  l?: string;
  /** A small tag, like "start" or "out". */
  d?: string;
  /** A number: seconds or percent. */
  n?: number;
  /** Site the visitor came from. Page views only. */
  r?: string;
};

export type WireBatch = {
  v: string;
  s: string;
  /** Screen width in px, used only to sort phone / tablet / computer. */
  w?: number;
  /** True when the browser asked not to be tracked. */
  x?: boolean;
  e: WireEvent[];
};

/** A stored row. */
export type SiteEvent = {
  id: number;
  created_at: string;
  visitor_id: string;
  session_id: string;
  type: EventType;
  path: string;
  target: string | null;
  label: string | null;
  detail: string | null;
  value: number | null;
  referrer: string | null;
  device: Device | null;
  private: boolean;
  family: boolean;
  player_id: string | null;
  games_session_id: string | null;
};

export type NewSiteEvent = Omit<SiteEvent, "id" | "created_at">;
