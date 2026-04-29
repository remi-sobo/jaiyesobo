import { ImageResponse } from "next/og";
import { getPlayByToken } from "@/lib/games/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const play = await getPlayByToken(token);

  const payload = (play?.payload ?? {}) as { prompt_text?: string; picks?: string[] };
  const result = (play?.result ?? null) as { rating?: number; take?: string } | null;

  const prompt = payload.prompt_text ?? "Top 5";
  const picks = (payload.picks ?? []).slice(0, 5);
  const rating = result?.rating ?? null;
  const take = result?.take ?? "Play yours at jaiyesobo.com/games";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#F5F1EA",
          display: "flex",
          padding: "64px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background:
              "linear-gradient(to right, #E63946 0%, #F5C842 50%, #3ECFB2 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, transparent 35%, rgba(230,57,70,0.18) 48%, transparent 60%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 20,
            }}
          >
            jaiyesobo.com / games · Top 5
          </div>

          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#F5F1EA",
              marginBottom: 30,
              maxWidth: 900,
            }}
          >
            {prompt}
          </div>

          <div style={{ display: "flex", gap: 60, alignItems: "flex-start", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {picks.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: 32,
                    fontWeight: 600,
                    color: "#F5F1EA",
                    gap: 16,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ color: "#8a8a8a", fontWeight: 900, width: 36 }}>{i + 1}</span>
                  <span>{p}</span>
                </div>
              ))}
              {picks.length === 0 && (
                <div style={{ fontSize: 28, color: "#8a8a8a", fontStyle: "italic" }}>
                  No picks yet.
                </div>
              )}
            </div>

            {rating !== null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 260,
                }}
              >
                <div
                  style={{
                    fontSize: 200,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "#F5C842",
                    letterSpacing: "-0.05em",
                  }}
                >
                  {rating}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    color: "#8a8a8a",
                    marginTop: 4,
                  }}
                >
                  of 10
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 22,
              fontStyle: "italic",
              color: "#e8dfd0",
              marginTop: 24,
              maxWidth: 1000,
            }}
          >
            “{take}”
          </div>

          <div
            style={{
              fontSize: 16,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginTop: 30,
            }}
          >
            Curated by Jaiye Sobo, age 8 · A father-son project from East Palo Alto
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
