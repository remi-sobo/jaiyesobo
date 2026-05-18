import { ImageResponse } from "next/og";
import { getPlayByToken } from "@/lib/games/data";
import type { DraftWheelPlayPayload, DraftWheelVerdict } from "@/lib/games/draft-wheel";
import type { CutPlayResult, CutPlayPayload } from "@/lib/games/the-cut";
import type { BlindRankResult } from "@/lib/games/blind-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const play = await getPlayByToken(token);

  if (play?.game_slug === "trivia") {
    return triviaOgImage(play);
  }
  if (play?.game_slug === "word-search") {
    return wordSearchOgImage(play);
  }
  if (play?.game_slug === "draft-wheel") {
    return draftWheelOgImage(play);
  }
  if (play?.game_slug === "the-cut") {
    return theCutOgImage(play);
  }
  if (play?.game_slug === "blind-rank") {
    return blindRankOgImage(play);
  }
  return topFiveOgImage(play);
}

function blindRankOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
  const result = (play?.result ?? null) as BlindRankResult | null;
  const topicTitle = result?.topic_title ?? "Blind Rank";
  const total = result?.total_slots ?? 5;
  const score = result?.score ?? null;
  const perfect = score === total;
  const verdict = result?.verdict_line ?? "One at a time. No take-backs.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#F5F1EA",
          display: "flex",
          padding: "56px 64px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <TopBar />
        <Streak />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 7,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 10,
            }}
          >
            jaiyesobo.com / games · Blind Rank
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#F5F1EA",
              marginBottom: 18,
              maxWidth: 1000,
            }}
          >
            {topicTitle}
          </div>

          <div style={{ display: "flex", flex: 1, gap: 36, alignItems: "stretch" }}>
            {/* Score block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                minWidth: 220,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  marginBottom: 4,
                }}
              >
                Score
              </div>
              <div
                style={{
                  fontSize: 200,
                  fontWeight: 900,
                  lineHeight: 1,
                  color:
                    score === null
                      ? "#F5F1EA"
                      : perfect
                      ? "#3ECFB2"
                      : score >= 3
                      ? "#F5C842"
                      : score === 0
                      ? "#E63946"
                      : "#F5F1EA",
                  letterSpacing: "-0.05em",
                  display: "flex",
                  alignItems: "baseline",
                }}
              >
                {score ?? "—"}
                <span style={{ color: "#8a8a8a", fontSize: 80 }}>/{total}</span>
              </div>
              {perfect && (
                <div
                  style={{
                    fontSize: 20,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#3ECFB2",
                    marginTop: 4,
                  }}
                >
                  ✓ Perfect
                </div>
              )}
            </div>

            {/* Side-by-side lists */}
            <div style={{ display: "flex", flex: 1, gap: 24 }}>
              <Column
                label="You"
                rows={
                  result?.slot_results.map((sr) => ({
                    slot: sr.slot,
                    name: sr.player_name,
                    correct: sr.correct,
                  })) ?? []
                }
              />
              <Column
                label="Truth"
                rows={
                  result?.slot_results.map((sr) => ({
                    slot: sr.slot,
                    name: sr.ai_name,
                    correct: sr.correct,
                  })) ?? []
                }
                truth
              />
            </div>
          </div>

          {result && (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontStyle: "italic",
                color: "#F5F1EA",
                marginTop: 18,
                maxWidth: 1000,
              }}
            >
              &ldquo;{verdict}&rdquo;
            </div>
          )}

          <Footer cta="jaiyesobo.com/games/blind-rank" />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function Column({
  label,
  rows,
  truth,
}: {
  label: string;
  rows: { slot: number; name: string; correct: boolean }[];
  truth?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div
        style={{
          fontSize: 14,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#8a8a8a",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length > 0
          ? rows.map((r) => {
              const accent = truth
                ? "#F5C842"
                : r.correct
                ? "#3ECFB2"
                : "#E63946";
              return (
                <div
                  key={r.slot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: `2px solid ${accent}`,
                    background: `${accent}14`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: accent,
                      color: truth ? "#0a0a0a" : r.correct ? "#0a0a0a" : "#F5F1EA",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {r.slot}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#F5F1EA",
                      lineHeight: 1.1,
                    }}
                  >
                    {r.name}
                  </div>
                </div>
              );
            })
          : Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  border: "2px dashed #2a2a2a",
                  borderRadius: 4,
                  height: 44,
                }}
              />
            ))}
      </div>
    </div>
  );
}

function theCutOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
  const payload = (play?.payload ?? null) as CutPlayPayload | null;
  const result = (play?.result ?? null) as CutPlayResult | null;

  const setTitle = result?.set_title ?? payload?.set_title ?? "The Cut";
  const criterion = result?.criterion_summary ?? payload?.criterion_summary ?? "";
  const score = result?.score ?? null;
  const total = result?.total_keeps ?? 4;
  const perfect = score === total;

  const correctSet = new Set(result?.correct_keeps ?? []);
  const wrongSet = new Set(result?.wrong_keeps ?? []);
  const missedSet = new Set(result?.missed_keeps ?? []);
  const items = result?.all_items_with_facts ?? [];

  function statusOf(name: string): "correct_keep" | "wrong_keep" | "missed_keep" | "correct_cut" {
    if (correctSet.has(name)) return "correct_keep";
    if (wrongSet.has(name)) return "wrong_keep";
    if (missedSet.has(name)) return "missed_keep";
    return "correct_cut";
  }

  function indicatorFor(s: ReturnType<typeof statusOf>) {
    if (s === "correct_keep") return { icon: "✓", color: "#3ECFB2" };
    if (s === "wrong_keep") return { icon: "✗", color: "#E63946" };
    if (s === "missed_keep") return { icon: "?", color: "#F5C842" };
    return { icon: "·", color: "#666" };
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#F5F1EA",
          display: "flex",
          padding: "56px 64px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <TopBar />
        <Streak />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 7,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 10,
            }}
          >
            jaiyesobo.com / games · The Cut
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#F5F1EA",
              marginBottom: 6,
              maxWidth: 900,
            }}
          >
            {setTitle}
          </div>
          {criterion && (
            <div
              style={{
                fontSize: 22,
                fontStyle: "italic",
                color: "#F5C842",
                marginBottom: 18,
                maxWidth: 900,
              }}
            >
              {criterion}
            </div>
          )}

          <div style={{ display: "flex", flex: 1, gap: 40, alignItems: "stretch" }}>
            {/* Score block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                minWidth: 240,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  marginBottom: 6,
                }}
              >
                Score
              </div>
              <div
                style={{
                  fontSize: 180,
                  fontWeight: 900,
                  lineHeight: 1,
                  color:
                    score === null
                      ? "#F5F1EA"
                      : perfect
                      ? "#3ECFB2"
                      : score >= 2
                      ? "#F5C842"
                      : "#E63946",
                  letterSpacing: "-0.05em",
                  display: "flex",
                  alignItems: "baseline",
                }}
              >
                {score ?? "—"}
                <span style={{ color: "#8a8a8a", fontSize: 80 }}>/{total}</span>
              </div>
              {perfect && (
                <div
                  style={{
                    fontSize: 20,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#3ECFB2",
                    marginTop: 4,
                  }}
                >
                  ✓ Perfect
                </div>
              )}
            </div>

            {/* 4×2 grid of names */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 12,
                flex: 1,
              }}
            >
              {items.slice(0, 8).map((it) => {
                const s = statusOf(it.name);
                const ind = indicatorFor(s);
                return (
                  <div
                    key={it.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      border: `2px solid ${ind.color}`,
                      borderRadius: 4,
                      padding: "10px 12px",
                      background: s === "correct_cut" ? "transparent" : `${ind.color}14`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: ind.color,
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>
                        {s === "correct_keep"
                          ? "Keep"
                          : s === "wrong_keep"
                          ? "Wrong"
                          : s === "missed_keep"
                          ? "Missed"
                          : "Cut"}
                      </span>
                      <span>{ind.icon}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: "#F5F1EA",
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.05,
                      }}
                    >
                      {it.name}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      border: "2px dashed #2a2a2a",
                      borderRadius: 4,
                    }}
                  />
                ))}
            </div>
          </div>

          <Footer cta="jaiyesobo.com/games/the-cut" />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function draftWheelOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
  const payload = (play?.payload ?? null) as DraftWheelPlayPayload | null;
  const verdict = (play?.result ?? null) as DraftWheelVerdict | null;
  const a = payload?.player_names?.a ?? "Player 1";
  const b = payload?.player_names?.b ?? "Player 2";
  const winner =
    verdict?.winner === "a" ? a : verdict?.winner === "b" ? b : null;
  const verdictText = verdict?.verdict ?? "Spin the team. Pick the spot. AI calls it.";
  const series = verdict?.series_score ? `Best-of-7 · ${verdict.series_score}` : null;
  // Up to 5 team logos that came up. Show as monogram squares with team color.
  const teams = (payload?.rounds ?? [])
    .flatMap((r) => [r.a, r.b])
    .filter((t): t is NonNullable<typeof t> => !!t)
    .slice(0, 10);

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
        <TopBar />
        <Streak />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 16,
            }}
          >
            jaiyesobo.com / games · Draft Wheel
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#F5F1EA",
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              maxWidth: 1080,
            }}
          >
            {winner ? (
              <>
                {winner}
                <span style={{ color: "#E63946", fontStyle: "italic", fontWeight: 400 }}>
                  &nbsp;won.
                </span>
              </>
            ) : verdict?.winner === "tie" ? (
              <>
                It&apos;s a&nbsp;
                <span style={{ color: "#F5C842", fontStyle: "italic", fontWeight: 400 }}>
                  tie.
                </span>
              </>
            ) : (
              <>
                {a}
                <span style={{ color: "#8a8a8a" }}>&nbsp;vs&nbsp;</span>
                {b}
              </>
            )}
          </div>

          {series && (
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "#F5C842",
                border: "1px solid #F5C842",
                padding: "6px 14px",
                borderRadius: 4,
                marginBottom: 24,
                alignSelf: "flex-start",
              }}
            >
              {series}
            </div>
          )}

          <div
            style={{
              fontSize: 30,
              fontStyle: "italic",
              color: "#F5F1EA",
              lineHeight: 1.25,
              marginBottom: 28,
              maxWidth: 1080,
            }}
          >
            “{verdictText}”
          </div>

          {teams.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {teams.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: "#F5F1EA",
                    background: t.team.primary_color || "#222",
                    borderRadius: 6,
                    opacity: t.rerolled ? 0.55 : 1,
                  }}
                >
                  {t.team.abbreviation}
                </div>
              ))}
            </div>
          )}

          <Footer cta="Play yours at jaiyesobo.com/games/draft-wheel" />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function wordSearchOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
  const payload = (play?.payload ?? {}) as { title?: string; difficulty?: string };
  const result = (play?.result ?? null) as
    | {
        time_ms?: number;
        perfect?: boolean;
        words_found_count?: number;
        total_words?: number;
        roast?: string;
      }
    | null;
  const title = payload.title ?? "Word Search";
  const difficulty = (payload.difficulty ?? "medium").toUpperCase();
  const ms = Math.max(0, Math.floor((result?.time_ms ?? 0) / 1000));
  const m = Math.floor(ms / 60);
  const s = ms % 60;
  const timeText = `${m}:${s.toString().padStart(2, "0")}`;
  const perfect = !!result?.perfect;
  const found = result?.words_found_count ?? 0;
  const total = result?.total_words ?? 0;
  const roast = result?.roast ?? "Play yours at jaiyesobo.com/games/word-search";

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
        <TopBar />
        <Streak />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 16,
            }}
          >
            jaiyesobo.com / games · Word Search
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#F5F1EA",
              marginBottom: 12,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#3ECFB2",
              border: "1px solid #3ECFB2",
              padding: "6px 14px",
              borderRadius: 4,
              marginBottom: 32,
              alignSelf: "flex-start",
            }}
          >
            {difficulty}
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 80 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  marginBottom: 4,
                }}
              >
                Time
              </div>
              <div
                style={{
                  fontSize: 220,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: perfect ? "#F5C842" : "#F5F1EA",
                  letterSpacing: "-0.05em",
                  display: "flex",
                }}
              >
                {timeText}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                flex: 1,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 22,
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    color: "#8a8a8a",
                  }}
                >
                  Words
                </div>
                <div
                  style={{
                    fontSize: 80,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: perfect ? "#3ECFB2" : "#F5F1EA",
                    letterSpacing: "-0.03em",
                    display: "flex",
                    alignItems: "baseline",
                  }}
                >
                  {found}
                  <span style={{ color: "#8a8a8a", fontSize: 50 }}>/{total}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontStyle: "italic",
                  color: "#F5F1EA",
                  lineHeight: 1.2,
                }}
              >
                “{roast}”
              </div>
            </div>
          </div>

          <Footer cta="Play yours at jaiyesobo.com/games/word-search" />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function topFiveOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
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
        <TopBar />
        <Streak />
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
          <Footer />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function triviaOgImage(play: Awaited<ReturnType<typeof getPlayByToken>>) {
  const result = (play?.result ?? null) as
    | { score?: number; total?: number; difficulty?: string; roast?: string }
    | null;
  const score = result?.score ?? null;
  const total = result?.total ?? 10;
  const difficulty = (result?.difficulty ?? "medium").toUpperCase();
  const roast = result?.roast ?? "Play yours at jaiyesobo.com/games/trivia";
  const date = play?.created_at
    ? new Date(play.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

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
        <TopBar />
        <Streak />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#8a8a8a",
              marginBottom: 16,
            }}
          >
            jaiyesobo.com / games · Trivia
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#F5F1EA",
              marginBottom: 24,
            }}
          >
            The Court{" "}
            <span style={{ color: "#E63946", fontStyle: "italic", fontWeight: 400 }}>
              Report.
            </span>
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 80 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 260,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#F5C842",
                  letterSpacing: "-0.05em",
                  display: "flex",
                  alignItems: "baseline",
                }}
              >
                {score ?? "—"}
                <span style={{ color: "#8a8a8a", fontSize: 100, fontWeight: 400 }}>
                  /{total}
                </span>
              </div>
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  color: "#3ECFB2",
                  marginTop: 4,
                  border: "1px solid #3ECFB2",
                  padding: "6px 14px",
                  borderRadius: 4,
                }}
              >
                {difficulty}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontStyle: "italic",
                  color: "#F5F1EA",
                  lineHeight: 1.2,
                }}
              >
                “{roast}”
              </div>
              {date && (
                <div
                  style={{
                    fontSize: 20,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#8a8a8a",
                  }}
                >
                  {date}
                </div>
              )}
            </div>
          </div>

          <Footer cta="Play your round at jaiyesobo.com/games/trivia" />
        </div>
      </div>
    ),
    imageOpts()
  );
}

function TopBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: "linear-gradient(to right, #E63946 0%, #F5C842 50%, #3ECFB2 100%)",
      }}
    />
  );
}

function Streak() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(115deg, transparent 35%, rgba(230,57,70,0.18) 48%, transparent 60%)",
      }}
    />
  );
}

function Footer({ cta }: { cta?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: 30,
      }}
    >
      {cta && (
        <div
          style={{
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#F5C842",
          }}
        >
          {cta}
        </div>
      )}
      <div
        style={{
          fontSize: 16,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#8a8a8a",
        }}
      >
        Curated by Jaiye Sobo, age 8 · A father-son project from East Palo Alto
      </div>
    </div>
  );
}

function imageOpts() {
  return {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  } as const;
}
