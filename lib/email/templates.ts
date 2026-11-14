import type { LastWeekRow } from "@/components/sportsbook/public/last-week";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { SITE_URL, firstSentences, ordinal } from "./rules";

/**
 * Every email the site sends. Pure functions: data in, `{ subject, html, text,
 * headers }` out. Light background and simple tables with inline styles so they
 * render the same in Gmail and Apple Mail. Plain sentences, no emoji.
 */

export type Rendered = { subject: string; html: string; text: string; headers: Record<string, string> };

export const PLAY_URL = `${SITE_URL}/runitback/play`;

const RED = "#E63946";
const INK = "#111111";
const MUTE = "#6b6b6b";
const PAGE = "#f4f1ea";
const LINE = "#e3ded3";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const manageUrl = (manageToken: string) => `${SITE_URL}/email/preferences?t=${encodeURIComponent(manageToken)}`;
export const unsubscribeUrl = (manageToken: string) => `${SITE_URL}/api/email/unsubscribe?t=${encodeURIComponent(manageToken)}`;
export const confirmUrl = (confirmToken: string) => `${SITE_URL}/email/confirm?t=${encodeURIComponent(confirmToken)}`;

/** The two headers mail apps use for their own Unsubscribe button. */
export function listHeaders(manageToken: string): Record<string, string> {
  const mailto = process.env.EMAIL_REPLY_TO ?? CONTACT_EMAIL;
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(manageToken)}>, <mailto:${mailto}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

const p = (html: string, extra = "") => `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.55;color:${INK};${extra}">${html}</p>`;

const button = (href: string, label: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 22px;"><tr><td align="center" bgcolor="${RED}" style="background:${RED};border-radius:6px;"><a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font-family:${SANS};font-size:18px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(label)}</a></td></tr></table>`;

const eyebrow = (s: string) => `<div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${RED};margin:0 0 10px;">${esc(s)}</div>`;

const h1 = (s: string) => `<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:28px;line-height:1.15;font-weight:700;color:${INK};">${esc(s)}</h1>`;

type Shell = { preheader: string; html: string; text: string; manageToken: string; why: string };

function shell({ preheader, html, text, manageToken, why }: Shell): { html: string; text: string } {
  const address = process.env.EMAIL_MAILING_ADDRESS?.trim();
  const manage = manageUrl(manageToken);
  const unsub = unsubscribeUrl(manageToken);
  const footerLine = `Run It Back Picks · jaiyesobo.com`;
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Run It Back</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PAGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 14px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${INK};"><span style="color:${RED};">&#9632;</span> Run It Back</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:8px;padding:28px 26px;">
${html}
</td></tr>
<tr><td style="padding:18px 6px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTE};">
${esc(why)}<br>
<a href="${esc(manage)}" style="color:${MUTE};text-decoration:underline;">Manage what I get</a> &nbsp;·&nbsp; <a href="${esc(unsub)}" style="color:${MUTE};text-decoration:underline;">Unsubscribe</a><br>
${esc(footerLine)}${address ? `<br>${esc(address)}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
  const plain = `${text.trim()}

--
${why}
Manage what I get: ${manage}
Unsubscribe: ${unsub}
${footerLine}${address ? `\n${address}` : ""}
`;
  return { html: page, text: plain };
}

export type Wants = { results: boolean; newsletter: boolean };

/** "your results every Monday, plus a note when there's a new episode or column" */
export function getsLine(w: Wants): string {
  if (w.results && w.newsletter) return "your results every Monday, plus a note when there is a new episode or column";
  if (w.results) return "your results every Monday";
  if (w.newsletter) return "a note when there is a new episode or column";
  return "nothing yet";
}

/* Confirm and consent */

export function confirmEmail(i: { confirmToken: string; manageToken: string } & Wants): Rendered {
  const url = confirmUrl(i.confirmToken);
  const gets = getsLine(i);
  const body =
    eyebrow("One tap") +
    h1("Confirm your email") +
    p(`Tap the button to finish. After that you will get ${esc(gets)}.`) +
    button(url, "Yes, confirm my email") +
    p("This link works for 7 days.", `color:${MUTE};font-size:14px;`) +
    p("If this wasn't you, ignore this email. Nothing is sent until you tap the button.", `color:${MUTE};font-size:14px;margin-bottom:0;`);
  const text = `Confirm your email for Run It Back

Tap this link to finish. After that you will get ${gets}.
${url}

This link works for 7 days. If this wasn't you, ignore this email.`;
  const s = shell({
    preheader: "One tap to confirm your email.",
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because this address was entered at jaiyesobo.com.",
  });
  return { subject: "Confirm your email for Run It Back", ...s, headers: listHeaders(i.manageToken) };
}

export function parentConsentEmail(i: { confirmToken: string; manageToken: string; playerName?: string | null } & Wants): Rendered {
  const url = confirmUrl(i.confirmToken);
  const name = i.playerName?.trim() || null;
  const who = name ? `${name}` : "A young player";
  const gets: string[] = [];
  if (i.results) gets.push(name ? `Every Monday, a short email with how ${name} did that week.` : "Every Monday, a short email with the week's results.");
  if (i.newsletter) gets.push("A note when Jaiye puts out a new episode or column.");
  const list = gets.map((g) => `<li style="margin:0 0 6px;">${esc(g)}</li>`).join("");
  const label = name ? `Yes, send ${name}'s results to me` : "Yes, send it to me";
  const body =
    eyebrow("Parent check") +
    h1(name ? `${name} signed up for Run It Back` : "A parent check for Run It Back") +
    p(
      name
        ? `${esc(who)} is playing Run It Back Picks, a free NBA pick'em with no money in it. It was made by Jaiye, who is 9, and his dad Remi. ${esc(name)} was asked to use a parent's email, so we are asking you first.`
        : `This address was entered for Jaiye's Run It Back updates, and the form said a young player is involved. Run It Back Picks is a free NBA pick'em with no money in it, made by Jaiye, who is 9, and his dad Remi. We are asking you first.`,
    ) +
    p("If you say yes, here is what you will get:", "margin-bottom:8px;") +
    `<ul style="margin:0 0 18px;padding-left:22px;font-family:${SANS};font-size:16px;line-height:1.55;color:${INK};">${list}</ul>` +
    p(`We only email you, never ${name ? esc(name) : "the player"}. We never show your address to anyone, and you can stop any time with the link at the bottom.`) +
    button(url, label) +
    p("If this wasn't you, ignore this email. Nothing is sent until you tap the button. This link works for 7 days.", `color:${MUTE};font-size:14px;margin-bottom:0;`);
  const text = `${name ? `${name} signed up for Run It Back` : "A parent check for Run It Back"}

${
    name
      ? `${name} is playing Run It Back Picks, a free NBA pick'em with no money in it, made by Jaiye (9) and his dad Remi. ${name} was asked to use a parent's email, so we are asking you first.`
      : `This address was entered for Jaiye's Run It Back updates, and the form said a young player is involved. Run It Back Picks is a free NBA pick'em with no money in it, made by Jaiye (9) and his dad Remi. We are asking you first.`
  }

If you say yes, you will get:
${gets.map((g) => `- ${g}`).join("\n")}

We only email you, never ${name ?? "the player"}. We never show your address to anyone.

${label}:
${url}

If this wasn't you, ignore this email. Nothing is sent until you tap the link. This link works for 7 days.`;
  const s = shell({
    preheader: name ? `${name} asked to get results by email. Please say yes or ignore this.` : "Please say yes or ignore this.",
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because this address was entered at jaiyesobo.com.",
  });
  return {
    subject: name ? `Can we send ${name}'s Run It Back results to you?` : "Please confirm your email for Run It Back",
    ...s,
    headers: listHeaders(i.manageToken),
  };
}

/* Results */

export type ResultsInput = {
  season: string;
  row: LastWeekRow;
  /** Jaiye's recap for the week; the first two sentences go in. */
  recap?: string | null;
  manageToken: string;
};

const pts = (n: number) => `${n} ${Math.abs(n) === 1 ? "point" : "points"}`;

function vsLine(who: string, diff: number): string {
  if (diff > 0) return `You beat ${who} by ${pts(diff)}.`;
  if (diff < 0) return `${who} beat you by ${pts(-diff)}.`;
  return `You tied ${who}.`;
}

export function resultsSubject(row: LastWeekRow): string {
  const head = row.winnerName ? `Week ${row.week}: ${row.winnerName} won` : `Week ${row.week}: it was a tie`;
  return row.me ? `${head}. You finished ${ordinal(row.me.rank)}.` : head;
}

export function resultsEmail(i: ResultsInput): Rendered {
  const { row } = i;
  const url = `${SITE_URL}/runitback/${i.season}/week-${row.week}`;
  const winnerLine = row.winnerName
    ? `${row.winnerName} won the week with ${pts(row.winnerPoints)}.`
    : `The top spot was a tie at ${pts(row.winnerPoints)}.`;
  const h2h =
    row.jaiye === row.remi
      ? `Jaiye and Remi tied at ${pts(row.jaiye)}.`
      : row.jaiye > row.remi
        ? `Jaiye ${row.jaiye}, Remi ${row.remi}. Jaiye wins the family week by ${pts(row.jaiye - row.remi)}.`
        : `Remi ${row.remi}, Jaiye ${row.jaiye}. Remi wins the family week by ${pts(row.remi - row.jaiye)}.`;
  const mine = row.me
    ? [`You finished ${ordinal(row.me.rank)} with ${pts(row.me.points)}.`, vsLine("Jaiye", row.me.vsJaiye), vsLine("Remi", row.me.vsRemi)]
    : [];
  const recap = firstSentences(i.recap, 2);
  const next = row.nextWeek;

  const topHtml = row.top
    .map(
      (t, idx) =>
        `<tr><td style="padding:7px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:13px;color:${MUTE};width:34px;">${idx + 1}</td><td style="padding:7px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:16px;color:${INK};">${esc(t.name)}</td><td align="right" style="padding:7px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:16px;font-weight:700;color:${INK};">${t.points}</td></tr>`,
    )
    .join("");

  const body =
    eyebrow(`Week ${row.week} results`) +
    h1(row.me ? `You finished ${ordinal(row.me.rank)}.` : row.winnerName ? `${row.winnerName} won Week ${row.week}.` : `Week ${row.week} was a tie.`) +
    (mine.length ? p(mine.map(esc).join(" ")) : "") +
    p(esc(winnerLine)) +
    p(esc(h2h)) +
    `<div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};margin:20px 0 6px;">Top five</div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">${topHtml}</table>` +
    (recap ? `<div style="border-left:3px solid ${RED};padding:2px 0 2px 14px;margin:0 0 22px;"><div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};margin:0 0 6px;">Jaiye's recap</div><div style="font-family:${SERIF};font-size:17px;line-height:1.5;color:${INK};">${esc(recap)}</div></div>` : "") +
    (next ? button(PLAY_URL, `Play Week ${next}`) : "") +
    p(`<a href="${esc(url)}" style="color:${RED};">See the full Week ${row.week} results</a>`, "margin-bottom:0;");

  const text = `${row.me ? `You finished ${ordinal(row.me.rank)}.` : row.winnerName ? `${row.winnerName} won Week ${row.week}.` : `Week ${row.week} was a tie.`}

${mine.length ? `${mine.join(" ")}\n\n` : ""}${winnerLine}
${h2h}

Top five:
${row.top.map((t, idx) => `${idx + 1}. ${t.name} ${t.points}`).join("\n")}
${recap ? `\nJaiye's recap: ${recap}\n` : ""}${next ? `\nPlay Week ${next}: ${PLAY_URL}\n` : ""}
Full results: ${url}`;

  const s = shell({
    preheader: row.winnerName ? `${row.winnerName} won with ${pts(row.winnerPoints)}.` : `A tie at ${pts(row.winnerPoints)}.`,
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because you asked for Run It Back results at jaiyesobo.com.",
  });
  return { subject: resultsSubject(row), ...s, headers: listHeaders(i.manageToken) };
}

/* Newsletter */

export type NewsletterInput = {
  kind: "episode" | "column";
  title: string;
  standfirst: string;
  url: string;
  /** A line from Jaiye or Remi to go above the standfirst. */
  note?: string;
  manageToken: string;
};

export function newsletterEmail(i: NewsletterInput): Rendered {
  const intro = i.kind === "episode" ? "Hey, it's Jaiye. New On The Court is up." : "Hey, it's Jaiye. A new column is up.";
  const cta = i.kind === "episode" ? "Watch the episode" : "Read the column";
  const body =
    eyebrow(i.kind === "episode" ? "On The Court" : "The Column") +
    p(esc(intro), "font-size:18px;") +
    h1(i.title) +
    (i.note ? `<div style="border-left:3px solid ${RED};padding:2px 0 2px 14px;margin:0 0 18px;font-family:${SERIF};font-size:17px;line-height:1.5;color:${INK};">${esc(i.note)}</div>` : "") +
    p(esc(i.standfirst)) +
    button(i.url, cta) +
    p("Want to play? New picks open every Monday.", `color:${MUTE};font-size:14px;margin-bottom:0;`);
  const text = `${intro}

${i.title}

${i.note ? `${i.note}\n\n` : ""}${i.standfirst}

${cta}: ${i.url}`;
  const s = shell({
    preheader: i.standfirst.slice(0, 110),
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because you asked for Jaiye's newsletter at jaiyesobo.com.",
  });
  return {
    subject: i.kind === "episode" ? `New On The Court: ${i.title}` : `New from Jaiye: ${i.title}`,
    ...s,
    headers: listHeaders(i.manageToken),
  };
}
