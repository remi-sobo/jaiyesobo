import { ImageResponse } from "next/og";
import { weekResultRow } from "@/lib/sportsbook/view";
import { parseWeekSlug } from "@/lib/sportsbook/weeks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Run It Back Picks: week results";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ season: string; week: string }> }) {
  const { week } = await params;
  const n = parseWeekSlug(week);
  let row = null;
  try {
    row = n ? await weekResultRow(n) : null;
  } catch {
    row = null;
  }
  const grading = row?.status === "graded";
  const eyebrow = n ? `WEEK ${n} · ${grading ? "GRADING" : row ? "FINAL" : "RUN IT BACK"}` : "RUN IT BACK PICKS";
  const headline = !n ? "JAIYE vs REMI" : grading || !row ? `Week ${n}` : row.winnerName ? `${row.winnerName} took it` : "It ended in a tie";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B0B0C", color: "#F7F7F8", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, letterSpacing: 8, color: "#E11D2E", fontFamily: "monospace" }}>{eyebrow}</div>
          <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 0.92, marginTop: 24, letterSpacing: -3 }}>{headline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "monospace" }}>
            <div style={{ fontSize: 26, color: "#9CA3AF", letterSpacing: 4 }}>RUN IT BACK PICKS</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, marginTop: 8 }}>
              <span style={{ color: "#E11D2E" }}>{`JAIYE ${row?.jaiye ?? 0}`}</span>
              <span style={{ color: "#9CA3AF", margin: "0 24px" }}>·</span>
              <span>{`REMI ${row?.remi ?? 0}`}</span>
            </div>
          </div>
          <div style={{ fontSize: 30, fontFamily: "monospace", color: "#0B0B0C", background: "#E11D2E", padding: "16px 24px" }}>EVERY PICK. EVERY SCORE.</div>
        </div>
      </div>
    ),
    size,
  );
}
