import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import type { PlayerKind, SbPlayer, SbPlayerWithCode } from "./types";

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

/** The challenger this browser belongs to, if any. Includes their own code: it's theirs to see, and never anyone else's. */
export async function getChallenger(): Promise<SbPlayerWithCode | null> {
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
    .is("deleted_at", null)
    .maybeSingle();
  return (data as SbPlayerWithCode | null) ?? null;
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

/** Cyrillic and Greek letters that pass for Latin ones (written as escapes so they can't be mistaken for the Latin letters). */
const LOOKALIKES: Record<string, string> = {
  // Cyrillic: а е о р с у х і ѕ ј һ к м т в н
  "\u0430": "a", "\u0435": "e", "\u043E": "o", "\u0440": "p", "\u0441": "c", "\u0443": "y", "\u0445": "x", "\u0456": "i", "\u0455": "s", "\u0458": "j", "\u04BB": "h", "\u043A": "k", "\u043C": "m", "\u0442": "t", "\u0432": "b", "\u043D": "h",
  // Greek: α ο ρ ν ι τ
  "\u03B1": "a", "\u03BF": "o", "\u03C1": "p", "\u03BD": "v", "\u03B9": "i", "\u03C4": "t",
};
const LOOKALIKE_RE = new RegExp(`[${Object.keys(LOOKALIKES).join("")}]`, "g");

/**
 * Folds a name down to plain a to z: fullwidth to ASCII, accents off, Cyrillic
 * and Greek lookalikes to Latin, then the usual digit and symbol swaps.
 */
function squash(v: string): string {
  return v
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(LOOKALIKE_RE, (c) => LOOKALIKES[c])
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

/**
 * The ways a name can read once squashed: as is, and with v standing in for u
 * ("fvck"). Only used for substring checks, where a stray v can't make a
 * blocked word out of an innocent one.
 */
function readings(text: string): string[] {
  const s = squash(text);
  return [s, s.replace(/v/g, "u")];
}

/**
 * Matches a blocked word with any of its letters repeated, so "fuuuck" and
 * "niiigg" are caught. A word's own double letters are still required, so "Bob"
 * isn't "boob" and "Knight" isn't "nigg". (Collapsing runs of letters and
 * comparing against the blocklist can't do that: "kkk" would shrink to "k".)
 */
const stretch = (w: string) => [...w].map((c) => `${c}+`).join("");
const BLOCKED_RE = BLOCKED.map((w) => new RegExp(stretch(w)));
const BLOCKED_WORD_RE = BLOCKED_WORDS.map((w) => new RegExp(`^${stretch(w)}$`));

/** True when the text has none of the blocked words, even spelled with numbers, symbols, accents or lookalike letters. */
export function isClean(text: string): boolean {
  if (readings(text).some((s) => BLOCKED_RE.some((re) => re.test(s)))) return false;
  const words = text.normalize("NFKC").toLowerCase().split(/[\s._'-]+/).map(squash);
  return !words.some((w) => BLOCKED_WORD_RE.some((re) => re.test(w)));
}

/**
 * Names that read as Remi, Jaiye or the site. Challengers only: Remi and
 * Jaiye's own rows never go through the name check. "remi" and "jaiye" must be
 * a whole word ("Real Remi", "remi2", "R3mi"), so Jaiyeola, Remington and
 * Jeremiah pass. "admin"/"official" match as a word prefix, so Badminton
 * passes but "Administrator" doesn't. The site names match anywhere.
 */
const RESERVED_WORDS = ["remi", "jaiye"];
const RESERVED_PREFIXES = ["admin", "official"];
const RESERVED_ANYWHERE = ["jaiyesobo", "runitback"];

function impersonates(text: string): boolean {
  const tokens = text.normalize("NFKC").toLowerCase().split(/[\s._'-]+/).map(squash).filter(Boolean);
  if (tokens.some((t) => RESERVED_WORDS.includes(t) || RESERVED_PREFIXES.some((p) => t.startsWith(p)))) return true;
  return readings(text).some((s) => RESERVED_ANYWHERE.some((r) => s.includes(r)));
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkDisplayName(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, error: "Type a name." };
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2) return { ok: false, error: "Name needs at least 2 letters." };
  if (name.length > 20) return { ok: false, error: "Keep it to 20 characters." };
  if (!/^[\p{L}\p{N} .'_-]+$/u.test(name)) return { ok: false, error: "Letters, numbers and spaces only." };
  if (!isClean(name)) return { ok: false, error: "Pick a different name." };
  const lower = name.toLowerCase();
  if (["remi", "jaiye", "jai", "jay", "dad", "daddy", "admin", "sobo"].includes(lower)) return { ok: false, error: "That name is taken." };
  if (impersonates(name)) return { ok: false, error: "Pick a different name." };
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

export type AgeBand = "13_plus" | "under_13";

export function isAgeBand(v: unknown): v is AgeBand {
  return v === "13_plus" || v === "under_13";
}

/** Makes a new challenger with a fresh player code. Retries if the code is taken. */
export async function createChallenger(name: string, ageBand: AgeBand | null): Promise<{ id: string; code: string }> {
  const supa = createServiceClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supa
      .from("sb_players")
      .insert({ kind: "challenger", display_name: name, code: newPlayerCode(), age_band: ageBand })
      .select("id, code")
      .single();
    if (!error && data) return { id: data.id as string, code: data.code as string };
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Couldn't make a player code.");
}

/** A challenger by player code, if the account is live. */
export async function challengerByCode(raw: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("sb_players")
    .select("id")
    .eq("code", normalizeCode(raw))
    .eq("kind", "challenger")
    .is("deleted_at", null)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
