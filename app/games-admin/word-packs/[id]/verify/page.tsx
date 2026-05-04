import { notFound } from "next/navigation";
import Link from "next/link";
import { getWordPackById } from "@/lib/games/word-search-data";
import VerifyPackEditor from "@/components/games/word-search/verify-pack-editor";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function VerifyWordPackPage({ params }: Props) {
  const { id } = await params;
  const pack = await getWordPackById(id);
  if (!pack) notFound();

  return (
    <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-6">
        <Link
          href="/games-admin/word-packs"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
        >
          ← All packs
        </Link>
      </div>
      <VerifyPackEditor pack={pack} />
    </main>
  );
}
