import type { LastWeekRow } from "@/components/sportsbook/public/last-week";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { instagram, youtube } from "@/lib/content/social";
import { SITE_URL, firstSentences, ordinal } from "./rules";

/** Footer postal address on every email: the work address, never a home address. */
export const MAILING_ADDRESS = "380 Portage Ave, Palo Alto, CA 94306";

/**
 * Every email the site sends. Pure functions: data in, `{ subject, html, text,
 * headers }` out. Styled like the Run It Back Picks app (brand_tokens.json):
 * ink background, Archivo italic headlines, red accent, JetBrains Mono labels.
 * Simple tables with inline styles and bgcolor attributes so Gmail, Apple Mail
 * and Outlook all keep the dark look. Plain sentences, no emoji.
 */

export type Rendered = { subject: string; html: string; text: string; headers: Record<string, string> };

export const PLAY_URL = `${SITE_URL}/runitback/play`;

/* Run It Back Picks tokens (public/runitback-brand/brand_tokens.json). */
const RED = "#E11D2E";
const PAGE = "#0B0B0C"; // ink
const CARD = "#151517"; // surface
const CARD2 = "#1E1E21"; // surface2
const LINE = "#2A2A2E";
const INK = "#F7F7F8"; // paper: body text on dark
const MUTE = "#9CA3AF"; // steel
const WIN = "#4ADE80";
const DISPLAY = "Archivo, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace";
/** Italic copy where the old serif was: recaps and notes. */
const SERIF = `${SANS};font-style:italic`;

/** Full horizontal lockup, 890x180, exported for email from wordmark_horizontal_dark_outlined.svg (SVG doesn't show in Gmail). */
const WORDMARK_URL = `${SITE_URL}/runitback-brand/png/wordmark_horizontal_dark_email.png`;
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,112,900;1,115,900&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500;700&display=swap";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const manageUrl = (manageToken: string) => `${SITE_URL}/email/preferences?t=${encodeURIComponent(manageToken)}`;
export const unsubscribeUrl = (manageToken: string) => `${SITE_URL}/api/email/unsubscribe?t=${encodeURIComponent(manageToken)}`;
export const confirmUrl = (confirmToken: string) => `${SITE_URL}/email/confirm?t=${encodeURIComponent(confirmToken)}`;
export const loginUrl = (linkToken: string) => `${SITE_URL}/runitback/login?t=${encodeURIComponent(linkToken)}`;

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
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 22px;"><tr><td align="center" bgcolor="${RED}" style="background:${RED};border-radius:14px;"><a href="${esc(href)}" style="display:inline-block;padding:16px 28px;font-family:${MONO};font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:14px;">${esc(label)}</a></td></tr></table>`;

const eyebrow = (s: string) =>
  `<div style="font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${RED};margin:0 0 12px;">${esc(s)}</div>`;

const h1 = (s: string) =>
  `<h1 style="margin:0 0 18px;font-family:${DISPLAY};font-size:32px;line-height:1.05;font-weight:900;font-style:italic;font-stretch:115%;letter-spacing:-0.5px;text-transform:uppercase;color:${INK};">${esc(s)}</h1>`;

const label = (s: string, extra = "") =>
  `<div style="font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};margin:22px 0 8px;${extra}">${esc(s)}</div>`;

const quote = (title: string, body: string) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;"><tr><td bgcolor="${CARD2}" style="background:${CARD2};border-left:3px solid ${RED};border-radius:0 12px 12px 0;padding:14px 16px;">${title ? `<div style="font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};margin:0 0 6px;">${esc(title)}</div>` : ""}<div style="font-family:${SERIF};font-size:17px;line-height:1.5;color:${INK};">${esc(body)}</div></td></tr></table>`;

/** A small "what's next" strip under the button. */
const nextUp = (s: string) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 0;"><tr><td style="border-top:1px solid ${LINE};padding:16px 0 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTE};"><span style="font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${RED};">Next</span>&nbsp;&nbsp;${esc(s)}</td></tr></table>`;

/** Numbered steps as stacked cards, like the app's pick cards. */
function steps(items: Array<{ title: string; body: string }>): string {
  const rows = items
    .map(
      (it, idx) =>
        `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${CARD2}" style="background:${CARD2};border:1px solid ${LINE};border-radius:14px;padding:16px 16px 16px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="56" align="center" valign="top" style="width:56px;font-family:${DISPLAY};font-size:28px;line-height:1;font-weight:900;font-style:italic;color:${RED};">${idx + 1}</td><td valign="top"><div style="font-family:${SANS};font-size:16px;font-weight:700;line-height:1.3;color:${INK};margin:0 0 4px;">${esc(it.title)}</div><div style="font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTE};">${esc(it.body)}</div></td></tr></table></td></tr></table></td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">${rows}</table>`;
}

/** Two side by side tiles: YouTube and Instagram. Same height; they stack on a phone. */
function socialTiles(voice: "jaiye" | "family" = "jaiye"): string {
  const tile = (href: string, kicker: string, title: string, sub: string, side: "l" | "r") =>
    `<td class="rib-tile" width="50%" valign="top" style="padding:0 ${side === "l" ? "5px" : "0"} 10px ${side === "r" ? "5px" : "0"};height:100%;"><a href="${esc(href)}" style="display:block;height:100%;text-decoration:none;"><table role="presentation" width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" style="height:100%;"><tr><td valign="top" bgcolor="${CARD2}" style="background:${CARD2};border:1px solid ${LINE};border-radius:14px;padding:16px;height:100%;"><div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${RED};margin:0 0 8px;">${esc(kicker)}</div><div style="font-family:${DISPLAY};font-size:20px;line-height:1.1;font-weight:900;font-style:italic;text-transform:uppercase;color:${INK};margin:0 0 6px;">${esc(title)}</div><div style="font-family:${SANS};font-size:13px;line-height:1.45;color:${MUTE};">${esc(sub)}</div></td></tr></table></a></td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px;"><tr>${tile(youtube.url, "YouTube", "On The Court", `Full episodes and Shorts at ${youtube.handle}. ${voice === "jaiye" ? "Me and my dad" : "Jaiye and his dad"} arguing about the NBA.`, "l")}${tile(instagram.url, "Instagram", "Clips and takes", `Hot takes and game night clips at ${instagram.handle}.`, "r")}</tr></table>`;
}

/** Nickname and player code, in a quiet mono card. */
function accountCard(nickname: string, code: string | null, label = "Your account"): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};">${esc(k)}</td><td align="right" style="padding:6px 0;font-family:${MONO};font-size:15px;font-weight:700;letter-spacing:1px;color:${INK};">${esc(v)}</td></tr>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;"><tr><td style="border:1px dashed ${LINE};border-radius:14px;padding:12px 16px;"><div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${RED};margin:0 0 4px;">${esc(label)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${row("Nickname", nickname)}${code ? row("Player code", code) : ""}</table></td></tr></table>`;
}

type Shell = {
  preheader: string;
  html: string;
  text: string;
  why: string;
  /** Subscriber emails carry Manage and Unsubscribe links. Login emails are one-offs the person asked for and have none. */
  manageToken?: string;
};

function shell({ preheader, html, text, manageToken, why }: Shell): { html: string; text: string } {
  // Postal address required in the footer of every email. EMAIL_MAILING_ADDRESS overrides it.
  const address = process.env.EMAIL_MAILING_ADDRESS?.trim() || MAILING_ADDRESS;
  const manage = manageToken ? manageUrl(manageToken) : null;
  const unsub = manageToken ? unsubscribeUrl(manageToken) : null;
  const footerLine = `Run It Back Picks · jaiyesobo.com`;
  const links =
    manage && unsub
      ? `<a href="${esc(manage)}" style="color:${MUTE};text-decoration:underline;">Manage what I get</a> &nbsp;·&nbsp; <a href="${esc(unsub)}" style="color:${MUTE};text-decoration:underline;">Unsubscribe</a><br>`
      : "";
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>Run It Back</title>
<link href="${FONTS_URL}" rel="stylesheet">
<style>:root{color-scheme:dark light;supported-color-schemes:dark light;} @media (max-width:520px){.rib-card{padding:24px 20px !important;} .rib-h1 h1{font-size:28px !important;} .rib-tile{display:block !important;width:100% !important;padding:0 0 10px !important;height:auto !important;}}</style></head>
<body bgcolor="${PAGE}" style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};"><tr><td align="center" style="padding:28px 12px 32px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 0 18px;"><a href="${PLAY_URL}" style="text-decoration:none;"><img src="${WORDMARK_URL}" width="200" height="40" alt="Run It Back Picks" style="display:block;border:0;width:200px;height:40px;color:${INK};font-family:${DISPLAY};font-size:20px;font-weight:900;font-style:italic;"></a></td></tr>
<tr><td bgcolor="${RED}" style="background:${RED};height:4px;line-height:4px;font-size:0;border-radius:18px 18px 0 0;">&nbsp;</td></tr>
<tr><td class="rib-card rib-h1" bgcolor="${CARD}" style="background:${CARD};border:1px solid ${LINE};border-top:0;border-radius:0 0 18px 18px;padding:30px 28px;">
${html}
</td></tr>
<tr><td style="padding:22px 6px 0;font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
<a href="${youtube.url}" style="color:${INK};text-decoration:none;">YouTube</a> <span style="color:${LINE};">&nbsp;/&nbsp;</span> <a href="${instagram.url}" style="color:${INK};text-decoration:none;">Instagram</a> <span style="color:${LINE};">&nbsp;/&nbsp;</span> <a href="${PLAY_URL}" style="color:${INK};text-decoration:none;">Play</a>
</td></tr>
<tr><td style="padding:14px 6px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTE};">
${esc(why)}<br>
${links}${esc(footerLine)}${address ? `<br>${esc(address)}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
  const plain = `${text.trim()}

--
${why}
YouTube: ${youtube.url}
Instagram: ${instagram.url}
${manage && unsub ? `Manage what I get: ${manage}\nUnsubscribe: ${unsub}\n` : ""}${footerLine}${address ? `\n${address}` : ""}
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
    p(`Tap the button and you're in. After that you'll get ${esc(gets)}.`) +
    button(url, "Yes, confirm my email") +
    nextUp("Right after you tap: a welcome from Jaiye with how Run It Back works, plus where to watch On The Court.") +
    p("This link works for 7 days. If this wasn't you, ignore this email. Nothing is sent until you tap the button.", `color:${MUTE};font-size:14px;margin:18px 0 0;`);
  const text = `Confirm your email for Run It Back

Tap this link and you're in. After that you'll get ${gets}.
${url}

Right after you tap: a welcome from Jaiye with how Run It Back works.

This link works for 7 days. If this wasn't you, ignore this email.`;
  const s = shell({
    preheader: "One tap and you're in.",
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
        `<tr><td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:13px;font-weight:700;color:${idx === 0 ? RED : MUTE};width:34px;">${idx + 1}</td><td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:16px;font-weight:600;color:${INK};">${esc(t.name)}</td><td align="right" style="padding:10px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:16px;font-weight:700;color:${idx === 0 ? WIN : INK};">${t.points}</td></tr>`,
    )
    .join("");

  const body =
    eyebrow(`Week ${row.week} results`) +
    h1(row.me ? `You finished ${ordinal(row.me.rank)}.` : row.winnerName ? `${row.winnerName} won Week ${row.week}.` : `Week ${row.week} was a tie.`) +
    (mine.length ? p(mine.map(esc).join(" ")) : "") +
    p(esc(winnerLine)) +
    p(esc(h2h)) +
    label("Top five") +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">${topHtml}</table>` +
    (recap ? quote("Jaiye's recap", recap) : "") +
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
    (i.note ? quote("", i.note) : "") +
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

/* Login */

export type LoginInput = {
  /** The 6 digit code, shown big. */
  code: string;
  /** One time token for the tap to sign in link. */
  linkToken: string;
  /** The player's nickname, so they know which account this opens. */
  name: string;
  minutes: number;
};

/** "Your Run It Back login code". Sent only because the person asked; no unsubscribe, nothing else in it. */
export function loginEmail(i: LoginInput): Rendered {
  const url = loginUrl(i.linkToken);
  const spaced = `${i.code.slice(0, 3)} ${i.code.slice(3)}`;
  const codeBox = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;"><tr><td align="center" bgcolor="${CARD2}" style="background:${CARD2};border:1px solid ${LINE};border-radius:14px;padding:22px 12px;"><div style="font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};margin:0 0 10px;">Your code</div><div style="font-family:${MONO};font-size:40px;font-weight:700;letter-spacing:10px;line-height:1;color:${INK};">${esc(spaced)}</div></td></tr></table>`;
  const body =
    eyebrow("Sign in") +
    h1(`Welcome back, ${i.name}`) +
    p("Type this code on the sign in screen, in the app or on the website.") +
    codeBox +
    p("On this device? Tap to sign in instead.", `color:${MUTE};font-size:14px;margin-bottom:8px;`) +
    button(url, "Sign me in") +
    p(`The code and the button work once, for ${i.minutes} minutes.`, `color:${MUTE};font-size:14px;`) +
    p("Didn't ask for this? Ignore it. Nobody can get in without the code.", `color:${MUTE};font-size:14px;margin-bottom:0;`);
  const text = `Welcome back, ${i.name}

Your Run It Back login code: ${i.code}

Type it on the sign in screen, in the app or on the website. Or open this link on this device:
${url}

The code and the link work once, for ${i.minutes} minutes. Didn't ask for this? Ignore it.`;
  const s = shell({
    preheader: `Your code is ${spaced}. It works for ${i.minutes} minutes.`,
    html: body,
    text,
    why: "You are getting this because someone asked for a Run It Back login code for this address.",
  });
  return { subject: `${i.code} is your Run It Back login code`, ...s, headers: {} };
}

/* Welcome */

export type WelcomeInput = {
  manageToken: string;
  relation: "self" | "parent";
  results: boolean;
  newsletter: boolean;
  /** The player's nickname, when the address belongs to a player. Fan box sign-ups have none. */
  nickname?: string | null;
  /** The player's code, so they (or their parent) can always get back in. */
  code?: string | null;
};

/** The four rules, matching the Support page and the grader (lib/sportsbook/grade.ts). */
export const HOW_IT_WORKS = [
  { title: "New picks every Monday", body: "10 to 12 NBA picks drop at the start of every week. Winners, spreads, player stats and a few weird ones." },
  { title: "Pick before tip-off", body: "Each pick locks when its game starts. Right picks earn their points. Wrong ones lose them." },
  { title: "Star your Lock of the Week", body: "One pick counts double. Right doubles the points, wrong costs double." },
  { title: "Beat me and my dad", body: "Most points by Sunday night wins the week. No money, just bragging rights." },
];

/** The same rules for the parent email, which comes from Remi and Jaiye, not Jaiye alone. */
const HOW_IT_WORKS_PARENT = HOW_IT_WORKS.map((s) => (s.title === "Beat me and my dad" ? { ...s, title: "Beat Jaiye and his dad" } : s));

/**
 * "You're in". Sent once, right after an address is confirmed: to the player
 * themself, or to the parent who said yes for a player under 13.
 */
export function welcomeEmail(i: WelcomeInput): Rendered {
  return i.relation === "parent" ? parentWelcome(i) : playerWelcome(i);
}

function playerWelcome(i: WelcomeInput): Rendered {
  const name = i.nickname?.trim() || null;
  const more = i.newsletter
    ? p("I'll also send you new takes, episodes and columns as they come, on top of your Run It Back picks.")
    : p(`Want my takes, episodes and columns too? <a href="${esc(manageUrl(i.manageToken))}" style="color:${RED};">Turn them on here</a>.`);
  const resultsLine = i.results ? p("Every Monday you'll get your results: where you finished, and whether you beat me and my dad.") : "";
  const body =
    eyebrow("Welcome") +
    h1(name ? `You're in, ${name}.` : "You're in.") +
    p("Hey, it's Jaiye. Thanks for signing up. Every week my dad and I pick NBA games, and now you're picking against us.", "font-size:17px;") +
    (name ? accountCard(name, i.code ?? null) : "") +
    label("How Run It Back works", "margin-top:4px;") +
    steps(HOW_IT_WORKS) +
    button(PLAY_URL, name ? "Make your picks" : "Play Run It Back") +
    label("More from me") +
    socialTiles() +
    more +
    resultsLine +
    p("See you on the board,", "margin:22px 0 2px;") +
    `<div style="font-family:${DISPLAY};font-size:30px;line-height:1;font-weight:900;font-style:italic;text-transform:uppercase;color:${INK};">Jaiye <span style="color:${RED};">#23</span></div>`;
  const text = `${name ? `You're in, ${name}.` : "You're in."}

Hey, it's Jaiye. Thanks for signing up. Every week my dad and I pick NBA games, and now you're picking against us.
${name ? `\nNickname: ${name}${i.code ? `\nPlayer code: ${i.code} (use it to sign back in on another device)` : ""}\n` : ""}
How Run It Back works:
${HOW_IT_WORKS.map((s, n) => `${n + 1}. ${s.title}. ${s.body}`).join("\n")}

${name ? "Make your picks" : "Play Run It Back"}: ${PLAY_URL}

More from me:
- On The Court on YouTube (${youtube.handle}): ${youtube.url}
- Clips and takes on Instagram (${instagram.handle}): ${instagram.url}

${i.newsletter ? "I'll also send you new takes, episodes and columns as they come, on top of your Run It Back picks." : `Want my takes, episodes and columns too? Turn them on: ${manageUrl(i.manageToken)}`}
${i.results ? "\nEvery Monday you'll get your results: where you finished, and whether you beat me and my dad.\n" : ""}
See you on the board,
Jaiye #23`;
  const s = shell({
    preheader: "Here's how it works, where to watch, and what's coming next.",
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because you confirmed your email at jaiyesobo.com.",
  });
  return { subject: name ? `You're in, ${name}. Welcome to Run It Back` : "You're in. Welcome to Run It Back", ...s, headers: listHeaders(i.manageToken) };
}

function parentWelcome(i: WelcomeInput): Rendered {
  const name = i.nickname?.trim() || null;
  const who = name ?? "your player";
  const gets: string[] = [];
  if (i.results) gets.push(`Every Monday: how ${who} did that week.`);
  if (i.newsletter) gets.push("New episodes, columns and takes from Jaiye as they come.");
  const list = gets.map((g) => `<li style="margin:0 0 6px;">${esc(g)}</li>`).join("");
  const body =
    eyebrow("You said yes") +
    h1(name ? `Thanks. ${name} is all set.` : "Thanks. You're all set.") +
    p(`Run It Back Picks is a free NBA pick'em made by Jaiye, who is 9, and his dad Remi. No money, just bragging rights. Here's what ${esc(who)} signed up for.`) +
    (name ? accountCard(name, i.code ?? null, `${name}'s account`) + p(`The player code lets ${esc(name)} sign back in on another phone or computer. Keep it somewhere safe.`, `color:${MUTE};font-size:14px;margin-top:-10px;`) : "") +
    label("How it works", "margin-top:4px;") +
    steps(HOW_IT_WORKS_PARENT) +
    (list ? p("What comes to you:", "margin-bottom:8px;") + `<ul style="margin:0 0 18px;padding-left:22px;font-family:${SANS};font-size:16px;line-height:1.55;color:${INK};">${list}</ul>` : "") +
    quote("Privacy", `We only ever email you, never ${who}. Players under 13 play with a nickname only: we never ask for their real name. You can change or stop these emails any time from the links at the bottom.`) +
    label("Watch together") +
    socialTiles("family") +
    p("Thanks for letting them play,", "margin:22px 0 2px;") +
    `<div style="font-family:${DISPLAY};font-size:26px;line-height:1.1;font-weight:900;font-style:italic;text-transform:uppercase;color:${INK};">Remi <span style="color:${RED};">&amp;</span> Jaiye</div>`;
  const text = `${name ? `Thanks. ${name} is all set.` : "Thanks. You're all set."}

Run It Back Picks is a free NBA pick'em made by Jaiye (9) and his dad Remi. No money, just bragging rights.
${name ? `\nNickname: ${name}${i.code ? `\nPlayer code: ${i.code} (lets ${name} sign back in on another device; keep it somewhere safe)` : ""}\n` : ""}
How it works:
${HOW_IT_WORKS_PARENT.map((s, n) => `${n + 1}. ${s.title}. ${s.body}`).join("\n")}
${gets.length ? `\nWhat comes to you:\n${gets.map((g) => `- ${g}`).join("\n")}\n` : ""}
Privacy: we only ever email you, never ${who}. Players under 13 play with a nickname only: we never ask for their real name. You can change or stop these emails any time from the links below.

Watch together:
- On The Court on YouTube: ${youtube.url}
- Instagram ${instagram.handle}: ${instagram.url}

Thanks for letting them play,
Remi & Jaiye`;
  const s = shell({
    preheader: name ? `${name} is set up. Here's how it works and what you'll get.` : "Here's how it works and what you'll get.",
    html: body,
    text,
    manageToken: i.manageToken,
    why: "You are getting this because you said yes for a young player at jaiyesobo.com.",
  });
  return { subject: name ? `${name} is all set on Run It Back` : "You're all set on Run It Back", ...s, headers: listHeaders(i.manageToken) };
}
