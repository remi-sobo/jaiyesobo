import crypto from "node:crypto";

const TEN_MINUTES_MS = 10 * 60 * 1000;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

export function createOAuthState(): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now().toString();
  const payload = `${ts}.${nonce}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [tsStr, nonce, sig] = parts;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > TEN_MINUTES_MS) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${tsStr}.${nonce}`)
    .digest("hex")
    .slice(0, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
