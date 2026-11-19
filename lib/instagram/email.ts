import { SITE_URL } from "@/lib/email/rules";
import { esc } from "@/lib/email/templates";

/** The 6am email to Kendra, and the "reconnect Instagram" alert. Plain, phone first. */

export const pickerUrl = (token: string) => `${SITE_URL}/admin/replies?t=${encodeURIComponent(token)}`;

const wrap = (inner: string) => `<!doctype html><html><body style="margin:0;padding:0;background:#0B0B0C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0B0B0C"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px" bgcolor="#151517"><tr><td style="padding:28px 24px;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#F7F7F8">
${inner}
</td></tr></table></td></tr></table></body></html>`;

export type PreviewComment = { username: string; text: string; flagged: boolean };

export function morningEmail(token: string, comments: PreviewComment[]) {
  const n = comments.length;
  const flagged = comments.filter((c) => c.flagged).length;
  const subject = `${n} new comment${n === 1 ? "" : "s"} for Jaiye`;
  const url = pickerUrl(token);
  const preview = comments
    .slice(0, 5)
    .map(
      (c) =>
        `<p style="margin:0 0 10px;font-size:15px;line-height:1.45;color:#F7F7F8"><span style="color:#9CA3AF">@${esc(c.username)}</span> ${
          c.flagged ? `<span style="color:#E11D2E">(flagged)</span>` : esc(c.text.length > 120 ? `${c.text.slice(0, 117)}...` : c.text)
        }</p>`,
    )
    .join("");
  const more = n > 5 ? `<p style="margin:0 0 10px;font-size:14px;color:#9CA3AF">and ${n - 5} more</p>` : "";
  const flagLine = flagged
    ? `<p style="margin:0 0 18px;font-size:14px;color:#9CA3AF">${flagged} flagged for you to look at. Those have no reply options.</p>`
    : "";
  const html = wrap(`
<p style="margin:0 0 6px;font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF">@onthecourt_pod</p>
<p style="margin:0 0 18px;font-size:22px;font-weight:700;line-height:1.25">${esc(subject)}</p>
${preview}${more}
${flagLine}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td bgcolor="#E11D2E" style="border-radius:6px">
<a href="${url}" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">Pick replies</a>
</td></tr></table>
<p style="margin:0;font-size:13px;line-height:1.5;color:#9CA3AF">Each tap posts right away as @onthecourt_pod. This link works for 72 hours. Please don't forward it.</p>`);
  const text = `${subject}

${comments
  .slice(0, 5)
  .map((c) => `@${c.username}: ${c.flagged ? "(flagged)" : c.text}`)
  .join("\n")}${n > 5 ? `\nand ${n - 5} more` : ""}

Pick replies: ${url}

Each tap posts right away as @onthecourt_pod. This link works for 72 hours. Please don't forward it.`;
  return { subject, html, text };
}

export function reconnectEmail(error: string) {
  const subject = "Reconnect Instagram for the reply picker";
  const url = `${SITE_URL}/admin/setup`;
  const html = wrap(`
<p style="margin:0 0 18px;font-size:20px;font-weight:700">${subject}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">This morning's comment check couldn't reach Instagram, so Kendra didn't get an email. Open Setup and click Connect Instagram.</p>
<p style="margin:0 0 18px;font-size:13px;color:#9CA3AF">${esc(error)}</p>
<a href="${url}" style="color:#E11D2E;font-weight:700">Open Setup</a>`);
  const text = `${subject}\n\nThis morning's comment check couldn't reach Instagram, so Kendra didn't get an email. Open Setup and click Connect Instagram: ${url}\n\n${error}`;
  return { subject, html, text };
}
