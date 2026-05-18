import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlindRankTopicById } from "@/lib/games/blind-rank-data";
import VerifyBlindRankEditor from "@/components/games/blind-rank/verify-editor";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function VerifyBlindRankPage({ params }: Props) {
  const { id } = await params;
  const topic = await getBlindRankTopicById(id);
  if (!topic) notFound();

  return (
    <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-6">
        <Link
          href="/games-admin/blind-rank"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
        >
          ← All topics
        </Link>
      </div>
      <VerifyBlindRankEditor topic={topic} />
    </main>
  );
}
