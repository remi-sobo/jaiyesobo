import type { Metadata } from "next";
import GameShell from "@/components/games/game-shell";
import DraftWheelGame from "@/components/games/draft-wheel/draft-wheel-game";
import { getCurrentSession } from "@/lib/games/session";

export const metadata: Metadata = {
  title: "Draft Wheel — Jaiye's Games",
  description:
    "Spin the team. Pick the best at the spot. AI calls it. 2-player same-room NBA roster builder.",
};

export const dynamic = "force-dynamic";

export default async function DraftWheelPage() {
  const session = await getCurrentSession();
  const initialAName =
    session?.kind === "anon" && session.session.display_name && session.session.display_name !== "Anonymous"
      ? session.session.display_name
      : null;

  return (
    <GameShell liveLabel="Draft Wheel · 2 players">
      <DraftWheelGame initialAName={initialAName} />
    </GameShell>
  );
}
