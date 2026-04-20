import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireKid } from "@/lib/session";
import { getJaiye } from "@/lib/data";
import { getAllPhotos } from "@/lib/photos";
import PhotosGrid from "@/components/me/photos-grid";
import BottomNav from "@/components/me/bottom-nav";

export const metadata: Metadata = {
  title: "Jaiye · Photos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  await requireKid("/me/photos");
  const jaiye = await getJaiye();
  if (!jaiye) redirect("/me");

  const photos = await getAllPhotos(jaiye.id);

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 pb-24">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 mb-12 pb-8 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
            <span className="w-6 h-px bg-[var(--color-red)]" />
            Photos
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,3.5vw,3rem)] tracking-[-0.02em] leading-[1.1]">
            Look what <span className="italic font-normal text-[var(--color-red)]">you&apos;ve made.</span>
          </h1>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
          {photos.length} photo{photos.length === 1 ? "" : "s"} so far
        </div>
      </header>

      <PhotosGrid photos={photos} />

      <BottomNav />
    </main>
  );
}
