import { NextResponse } from "next/server";
import { setKidSession } from "@/lib/session";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const pin = (body as { pin?: unknown })?.pin;
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
  }
  const expected = process.env.JAIYE_PIN;
  if (!expected || pin !== expected) {
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  await setKidSession();
  return NextResponse.json({ ok: true });
}
