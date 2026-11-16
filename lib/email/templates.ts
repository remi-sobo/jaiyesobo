import type { LastWeekRow } from "@/components/sportsbook/public/last-week";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
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

const MARK_URL = `${SITE_URL}/runitback-brand/png/symbol_reversed_transparent.png`;
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
<style>:root{color-scheme:dark light;supported-color-schemes:dark light;} @media (max-width:520px){.rib-card{padding:24px 20px !important;} .rib-h1 h1{font-size:28px !important;}}</style></head>
<body bgcolor="${PAGE}" style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};"><tr><td align="center" style="padding:28px 12px 32px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 18px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="padding-right:10px;vertical-align:middle;"><img src="${MARK_URL}" width="30" height="28" alt="" style="display:block;border:0;width:30px;height:28px;"></td>
<td style="vertical-align:middle;font-family:${DISPLAY};font-size:20px;font-weight:900;font-style:italic;font-stretch:115%;letter-spacing:-0.3px;text-transform:uppercase;color:${INK};">Run It Back <span style="font-family:${MONO};font-size:11px;font-weight:700;font-style:normal;letter-spacing:2px;color:${RED};vertical-align:middle;">Picks</span></td>
</tr></table>
</td></tr>
<tr><td bgcolor="${RED}" style="background:${RED};height:4px;line-height:4px;font-size:0;border-radius:18px 18px 0 0;">&nbsp;</td></tr>
<tr><td class="rib-card rib-h1" bgcolor="${CARD}" style="background:${CARD};border:1px solid ${LINE};border-top:0;border-radius:0 0 18px 18px;padding:30px 28px;">
${html}
</td></tr>
<tr><td style="padding:20px 6px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTE};">
${esc(why)}<br>
${links}${esc(footerLine)}${address ? `<br>${esc(address)}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
  const plain = `${text.trim()}

--
${why}
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
