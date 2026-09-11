import Image from "next/image";
import { HandNote, SectionLabel } from "@/components/site/type";

export default function Archive() {
  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto grid max-w-[1200px] gap-[clamp(24px,4vw,64px)] lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[3/2] w-full overflow-hidden">
          <Image
            src="/jaiye-portland.jpg"
            alt="Jaiye in Portland the year before"
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover object-[center_45%]"
          />
        </div>

        <div>
          <SectionLabel>The archive</SectionLabel>
          <div className="mt-6 flex flex-wrap items-baseline gap-4">
            <h2 className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4vw,3rem)] font-black leading-none tracking-[-0.03em]">
              Vol. 01
            </h2>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-red)]">
              Age 8
            </span>
          </div>
          <p className="mt-5 max-w-[44ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            This site keeps the old volumes instead of throwing them out. Vol. 01 was
            me at eight. This one is Vol. 02.
          </p>
          <HandNote className="mt-7">I was so small last year.</HandNote>
        </div>
      </div>
    </section>
  );
}
