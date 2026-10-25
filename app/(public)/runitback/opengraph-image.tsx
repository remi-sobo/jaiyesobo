import { ImageResponse } from "next/og";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Run It Back Picks: Jaiye vs Remi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let week: number | null = null;
  let jaiye = 0;
  let remi = 0;
  try {
    week = await featuredWeekNumber();
    const view = week ? await loadWeekView(week) : null;
    jaiye = view?.board.find((b) => b.player.kind === "jaiye")?.score.points ?? 0;
    remi = view?.board.find((b) => b.player.kind === "remi")?.score.points ?? 0;
  } catch {
    week = null;
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", color: "#F5F1EA", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", fontFamily: "serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, letterSpacing: 8, color: "#E63946", fontFamily: "monospace" }}>RUN IT BACK PICKS</div>
          <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 0.9, marginTop: 24, letterSpacing: -3 }}>JAIYE vs REMI</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "monospace" }}>
            <div style={{ fontSize: 26, color: "#8a8a8a", letterSpacing: 4 }}>{week ? `WEEK ${week}` : "WEEKLY NBA PICK'EM"}</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, marginTop: 8 }}>
              <span style={{ color: "#E63946" }}>{`JAIYE ${jaiye}`}</span>
              <span style={{ color: "#8a8a8a", margin: "0 24px" }}>·</span>
              <span>{`REMI ${remi}`}</span>
            </div>
          </div>
          <div style={{ fontSize: 30, fontFamily: "monospace", color: "#0a0a0a", background: "#E63946", padding: "16px 24px" }}>THINK YOU CAN BEAT US?</div>
        </div>
      </div>
    ),
    size,
  );
}
