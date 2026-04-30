import type { Metadata } from "next";
import Link from "next/link";
import GameShell from "@/components/games/game-shell";
import TopFiveResult from "@/components/games/top-five/top-five-result";
import TriviaResultReadOnly from "@/components/games/trivia/trivia-result-readonly";
import { getPlayByToken } from "@/lib/games/data";
import type { TopFiveVerdict } from "@/lib/games/top-five-types";
import type { Breakdown } from "@/components/games/trivia/trivia-result";
import type { TriviaDifficultyKey } from "@/lib/games/trivia-config";

type Props = { params: Promise<{ token: string }> };

type TriviaResult = {
  score: number;
  total: number;
  difficulty: TriviaDifficultyKey;
  roast: string;
  streak: { current: number; best: number };
  breakdown: Breakdown[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const play = await getPlayByToken(token);
  if (!play) return { title: "Not found — Jaiye's Games" };

  const ogUrl = `/api/games/og/${token}`;

  if (play.game_slug === "trivia") {
    const result = play.result as TriviaResult | null;
    const score = result ? `${result.score}/${result.total}` : "play";
    const title = `${score} on The Court Report · Jaiye's Games`;
    const description = result?.roast ?? "10 NBA trivia questions. Don't get cooked.";
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl],
      },
    };
  }

  const payload = play.payload as { prompt_text?: string };
  const prompt = payload?.prompt_text ?? "Top 5";
  const result = play.result as { rating?: number; take?: string } | null;
  const ratingText = result?.rating ? `${result.rating}/10` : "play";

  return {
    title: `${prompt} — ${ratingText} · Jaiye's Games`,
    description: result?.take ?? "Play your own at jaiyesobo.com/games",
    openGraph: {
      title: prompt,
      description: result?.take ?? "Play yours at jaiyesobo.com/games",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: prompt,
      description: result?.take ?? "Play yours at jaiyesobo.com/games",
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const play = await getPlayByToken(token);

  if (!play) {
    return (
      <GameShell>
        <main className="max-w-[640px] mx-auto px-6 py-24 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-tight mb-3">
            That link doesn&apos;t go anywhere.
          </h1>
          <p className="text-[var(--color-mute)] mb-8">
            The play might be archived, or the link was mistyped. Want to make your own?
          </p>
          <Link
            href="/games"
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            Play a game
          </Link>
        </main>
      </GameShell>
    );
  }

  if (play.game_slug === "trivia") {
    const result = play.result as TriviaResult | null;
    return (
      <GameShell liveLabel="Shared score">
        {!result ? (
          <main className="max-w-[640px] mx-auto px-6 py-20 text-center">
            <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
              This round is still being scored.
            </h1>
            <p className="text-[var(--color-mute)]">Refresh in a moment.</p>
          </main>
        ) : (
          <TriviaResultReadOnly
            score={result.score}
            total={result.total}
            difficulty={result.difficulty}
            roast={result.roast}
            breakdown={result.breakdown}
          />
        )}
        <div className="max-w-[760px] mx-auto px-6 pb-24 pt-2 text-center">
          <Link
            href="/games/trivia"
            className="inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            Play your own round →
          </Link>
        </div>
      </GameShell>
    );
  }

  // Default: Top 5
  const payload = play.payload as { prompt_text?: string; picks?: string[] };
  const prompt = payload?.prompt_text ?? "Top 5";
  const picks = payload?.picks ?? [];
  const verdict = play.result as TopFiveVerdict | null;

  return (
    <GameShell liveLabel="Shared verdict">
      {!verdict ? (
        <main className="max-w-[640px] mx-auto px-6 py-20 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
            This list is still being judged.
          </h1>
          <p className="text-[var(--color-mute)]">Refresh in a moment.</p>
        </main>
      ) : (
        <TopFiveResult prompt={prompt} picks={picks} verdict={verdict} />
      )}

      <div className="max-w-[760px] mx-auto px-6 pb-24 pt-2 text-center">
        <Link
          href="/games/top-five"
          className="inline-block bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-7 py-4 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
        >
          Play your own →
        </Link>
      </div>
    </GameShell>
  );
}
