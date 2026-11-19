import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";

/**
 * The one place that talks to Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Inert until RESEND_API_KEY is set: it logs and skips. It never throws, so a
 * mail problem can't break a request or a cron job.
 */

export type SendResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: "no-key" }
  | { status: "error"; error: string };

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export const DEFAULT_FROM = "Jaiye at Run It Back <picks@jaiyesobo.com>";

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(JSON.stringify({ scope: "email.send", skipped: "no-key", subject: input.subject }));
    return { status: "skipped", reason: "no-key" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // A hung request must not hold a cron run or a claim: a timeout lands in the catch below as an error result.
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
        to: [input.to],
        reply_to: process.env.EMAIL_REPLY_TO ?? CONTACT_EMAIL,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.headers ? { headers: input.headers } : {}),
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      const error = `${res.status} ${j.message ?? j.name ?? "send failed"}`;
      console.error(JSON.stringify({ scope: "email.send", status: res.status, err: error }));
      return { status: "error", error };
    }
    return { status: "sent", id: j.id ?? null };
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.send", err: String(e) }));
    return { status: "error", error: String(e) };
  }
}
