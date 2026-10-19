import { ImageResponse } from "next/og";
import { getJaiye } from "@/lib/data";
import { getPublishedPrediction } from "@/lib/nba/data";
import { deriveBracket, formatLockDate, isSeasonSlug, seriesScore } from "@/lib/nba/logic";
import { TEAMS, tileText } from "@/lib/nba/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Jaiye's NBA predictions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  let row = null;
  if (isSeasonSlug(season)) {
    try {
      const jaiye = await getJaiye();
      row = jaiye ? await getPublishedPrediction(jaiye.id, season) : null;
    } catch {
      row = null;
    }
  }

  const finals = row ? deriveBracket(row).FINALS : null;
  const champ = finals?.winner ? TEAMS[finals.winner] : null;
  const loser =
    finals?.winner && finals.top && finals.bottom
      ? finals.top.code === finals.winner
        ? finals.bottom.code
        : finals.top.code
      : null;
  const fmvp = row?.awards.finals_mvp?.player;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#F5F1EA",
          display: "flex",
          padding: "64px 72px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 6, color: "#E63946", fontFamily: "monospace" }}>
              JAIYESOBO.COM
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 0.95, marginTop: 24, letterSpacing: -2 }}>
              {`JAIYE'S ${season}`}
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 0.95, color: "#E63946", letterSpacing: -2 }}>
              NBA PREDICTIONS
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "monospace" }}>
            {champ && loser && finals ? (
              <div style={{ fontSize: 34, letterSpacing: 2 }}>
                {`${champ.code} beats ${loser} ${seriesScore(finals.games)}`}
              </div>
            ) : (
              <div style={{ fontSize: 34, letterSpacing: 2 }}>Picks coming soon</div>
            )}
            {fmvp ? <div style={{ fontSize: 24, color: "#8a8a8a", marginTop: 10 }}>{`Finals MVP: ${fmvp}`}</div> : null}
            {row?.published_at ? (
              <div style={{ fontSize: 22, color: "#8a8a8a", marginTop: 10 }}>
                {`Locked in ${formatLockDate(row.published_at)}`}
              </div>
            ) : null}
          </div>
        </div>
        {champ ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginLeft: 48 }}>
            <div style={{ fontSize: 22, letterSpacing: 6, color: "#E63946", fontFamily: "monospace", marginBottom: 18 }}>
              CHAMPION
            </div>
            <div
              style={{
                width: 340,
                height: 340,
                background: champ.primary,
                color: tileText(champ.primary),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 28,
                borderRadius: 8,
                position: "relative",
              }}
            >
              <div style={{ fontSize: 132, fontWeight: 900, lineHeight: 0.85, letterSpacing: -4 }}>{champ.code}</div>
              <div style={{ display: "flex", flexDirection: "column", fontSize: 28, fontFamily: "sans-serif" }}>
                <span>{champ.city}</span>
                <span>{champ.name}</span>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, background: champ.secondary }} />
            </div>
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
