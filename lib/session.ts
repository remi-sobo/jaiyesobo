import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const KID_COOKIE = "jaiye_session";
const ADMIN_COOKIE = "admin_session";
const ONE_WEEK_SEC = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function createToken(role: "kid" | "parent") {
  const expires = Date.now() + ONE_WEEK_SEC * 1000;
  const payload = `${role}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function verify(token: string | undefined): { role: "kid" | "parent"; expires: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expiresStr, sig] = parts;
  if (role !== "kid" && role !== "parent") return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = sign(`${role}.${expires}`);
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  return { role, expires };
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ONE_WEEK_SEC,
};

export async function setKidSession() {
  const c = await cookies();
  c.set(KID_COOKIE, createToken("kid"), cookieOpts);
}

export async function setAdminSession() {
  const c = await cookies();
  c.set(ADMIN_COOKIE, createToken("parent"), cookieOpts);
}

export async function getKidSession() {
  const c = await cookies();
  return verify(c.get(KID_COOKIE)?.value);
}

export async function getAdminSession() {
  const c = await cookies();
  return verify(c.get(ADMIN_COOKIE)?.value);
}

export async function requireKid() {
  const s = await getKidSession();
  if (!s) redirect("/me/lock");
  return s;
}

export async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/lock");
  return s;
}

export async function clearKidSession() {
  const c = await cookies();
  c.delete(KID_COOKIE);
}

export async function clearAdminSession() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}
