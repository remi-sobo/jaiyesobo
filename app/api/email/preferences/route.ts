import { NextResponse } from "next/server";
import { unsubscribe, updatePrefs } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/preferences (the preferences page's form: t, results,
 * newsletter, intent). A plain form post, so it works without JavaScript, and
 * it answers with a redirect back to the page.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const t = typeof form?.get("t") === "string" ? (form!.get("t") as string) : "";
  const back = (q: string) => NextResponse.redirect(new URL(`/email/preferences?t=${encodeURIComponent(t)}${q}`, req.url), 303);
  try {
    if (form?.get("intent") === "unsubscribe") {
      return (await unsubscribe(t)) ? back("&done=unsubscribed") : back("");
    }
    const view = await updatePrefs(t, { results: form?.get("results") === "on", newsletter: form?.get("newsletter") === "on" });
    return view ? back("&done=saved") : back("");
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.preferences", err: String(e) }));
    return back("&done=error");
  }
}
