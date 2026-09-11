import { publishedPosts } from "@/lib/content/posts";
import { episodes } from "@/lib/content/episodes";

const SITE = "https://jaiyesobo.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toUTCString();
}

/** One feed for both the column and the podcast, newest first. */
export function GET() {
  const items = [
    ...publishedPosts().map((p) => ({
      title: p.title,
      link: `${SITE}/column/${p.slug}`,
      description: p.standfirst,
      date: p.date,
    })),
    ...episodes.map((e) => ({
      title: e.title,
      link: `${SITE}/pod/${e.slug}`,
      description: e.standfirst,
      date: e.date,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Jaiye Sobo</title>
    <link>${SITE}</link>
    <description>The Column and On The Court. Basketball takes from a nine year old in East Palo Alto.</description>
    <language>en-us</language>
${items
  .map(
    (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${i.link}</link>
      <guid>${i.link}</guid>
      <description>${escapeXml(i.description)}</description>
      <pubDate>${rfc822(i.date)}</pubDate>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
