export type SubscribeReply = { ok: true; status: "check-your-inbox" | "parent-check" } | { ok: false; error: string };

/** POST /api/email/subscribe. Never throws; the error is a sentence for a person. */
export async function subscribeEmail(body: { email: string; under13?: boolean; newsletter?: boolean; results?: boolean; source?: string }): Promise<SubscribeReply> {
  try {
    const res = await fetch("/api/email/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string; status?: "check-your-inbox" | "parent-check" };
    if (!res.ok || !j.status) return { ok: false, error: j.error ?? "Something went wrong. Try again." };
    return { ok: true, status: j.status };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
}

/** What to tell a person after a successful sign up. */
export function subscribedMessage(status: "check-your-inbox" | "parent-check"): string {
  return status === "parent-check" ? "Thanks. We sent a note to your parent. They need to tap the button in it first." : "Check your inbox and tap the button to confirm.";
}
