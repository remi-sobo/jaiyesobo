import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import type { PlayerKind, SbPlayer } from "./types";

/**
 * Challenger identity. No accounts: the browser keeps a signed cookie with
 * the player id, and a short player code (HOOP-7342) restores it on another
 * device. Remi and Jaiye are fixed rows tied to their users.
 */

const COOKIE = "sb_player";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

function sign(id: string) {
  return crypto.createHmac("sha256", secret()).update(`sb:${id}`).digest("hex").slice(0, 32);
}

export async function setChallengerCookie(id: string) {
  const c = await cookies();
  c.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearChallengerCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

/** The challenger this browser belongs to, if any. */
export async function getChallenger(): Promise<SbPlayer | null> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || sig.length !== 32) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id)))) return null;
  const supa = createServiceClient();
  const { data } = await supa
    .from("sb_players")
    .select("id, kind, display_name, code, hidden")
    .eq("id", id)
    .eq("kind", "challenger")
    .maybeSingle();
  return (data as SbPlayer | null) ?? null;
}

const CODE_WORDS = [
  "HOOP", "DUNK", "SWISH", "BUCKET", "BOARD", "DIME", "BLOCK", "STEAL", "CLUTCH", "BANK",
  "BRICK", "FLOAT", "LOB", "TRIPLE", "GLASS", "COURT", "RIM", "NET", "PAINT", "WING",
];

export function newPlayerCode(): string {
  const word = CODE_WORDS[crypto.randomInt(CODE_WORDS.length)];
  return `${word}-${crypto.randomInt(1000, 10000)}`;
}

export function normalizeCode(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "").replace(/^([A-Z]+)(\d{4})$/, "$1-$2");
}

/* Names. It's a kid's site, so names are short and filtered. */

const BLOCKED = [
  "fuck", "shit", "bitch", "cunt", "pussy", "asshole", "bastard", "slut", "whore",
  "nigg", "faggot", "retard", "penis", "vagina", "porn", "nazi", "hitler", "kkk",
  "piss", "boob", "jizz", "dildo",
];

/** Words that only count on their own, so "Sexton", "Hancock" and "Shoemaker" still work. */
const BLOCKED_WORDS = ["sex", "cum", "anal", "hoe", "ass", "tit", "tits", "damn", "crap", "fu", "wtf", "stfu", "dick", "cock", "fag", "rape"];

function squash(v: string): string {
  return v
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkDisplayName(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, error: "Type a name." };
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2) return { ok: false, error: "Name needs at least 2 letters." };
  if (name.length > 20) return { ok: false, error: "Keep it to 20 characters." };
  if (!/^[\p{L}\p{N} .'_-]+$/u.test(name)) return { ok: false, error: "Letters, numbers and spaces only." };
  const s = squash(name);
  const words = name.toLowerCase().split(/[\s._'-]+/).map(squash);
  if (BLOCKED.some((w) => s.includes(w)) || words.some((w) => BLOCKED_WORDS.includes(w))) {
    return { ok: false, error: "Pick a different name." };
  }
  const lower = name.toLowerCase();
  if (["remi", "jaiye", "jai", "jay", "dad", "daddy", "admin", "sobo"].includes(lower)) return { ok: false, error: "That name is taken." };
  return { ok: true, name };
}

/** Remi and Jaiye rows, created the first time they're needed. */
export async function getHousePlayers(): Promise<Record<"remi" | "jaiye", SbPlayer>> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("sb_players").select("id, kind, display_name, code, hidden").in("kind", ["remi", "jaiye"]);
  if (error) throw error;
  const found = new Map((data ?? []).map((p) => [p.kind as PlayerKind, p as SbPlayer]));
  for (const kind of ["remi", "jaiye"] as const) {
    if (found.has(kind)) continue;
    let userId: string | null = null;
    if (kind === "jaiye") {
      const { data: u } = await supa.from("users").select("id").eq("role", "kid").eq("display_name", "Jaiye").maybeSingle();
      userId = u?.id ?? null;
    } else {
      const { data: u } = await supa.from("users").select("id").eq("role", "parent").limit(1).maybeSingle();
      userId = u?.id ?? null;
    }
    const { data: row, error: insErr } = await supa
      .from("sb_players")
      .insert({ kind, user_id: userId, display_name: kind === "remi" ? "Remi" : "Jaiye" })
      .select("id, kind, display_name, code, hidden")
      .single();
    if (insErr) {
      // Lost a race with another request; read it back.
      const { data: again } = await supa.from("sb_players").select("id, kind, display_name, code, hidden").eq("kind", kind).single();
      found.set(kind, again as SbPlayer);
    } else {
      found.set(kind, row as SbPlayer);
    }
  }
  return { remi: found.get("remi")!, jaiye: found.get("jaiye")! };
}
