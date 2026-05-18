import { notFound } from "next/navigation";
import Link from "next/link";
import { getCutSetById } from "@/lib/games/the-cut-data";
import VerifyCutSetEditor from "@/components/games/the-cut/verify-cut-set-editor";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function VerifyCutSetPage({ params }: Props) {
  const { id } = await params;
  const set = await getCutSetById(id);
  if (!set) notFound();

  return (
    <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-6">
        <Link
          href="/games-admin/cut-sets"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)]"
        >
          ← All sets
        </Link>
      </div>
      <VerifyCutSetEditor set={set} />
    </main>
  );
}
