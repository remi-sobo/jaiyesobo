import Image from "next/image";
import { featuredGame } from "@/lib/content/games";
import { Accent, SectionLabel } from "@/components/site/type";
import { PlayButton } from "@/components/site/buttons";

export default function PlaySomething() {
  const game = featuredGame();

  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-off-black)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <SectionLabel tone="yellow">Play something I made</SectionLabel>

        <div className="mt-8 grid gap-[clamp(24px,4vw,64px)] lg:grid-cols-2 lg:items-center">
          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-games-yellow)]">
              Made by Jaiye
            </div>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.2rem,4.4vw,3.2rem)] font-black leading-[0.95] tracking-[-0.03em]">
              <Accent text={game.title} accent={game.titleAccent} />
            </h2>
            <p className="mt-5 max-w-[46ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
              Five rounds. A player shows up, you lock him into a slot, and you
              can&apos;t move him after that. You don&apos;t know who&apos;s coming next.
            </p>
            {game.href && (
              <div className="mt-8">
                <PlayButton href={game.href} tone="yellow">
                  Play
                </PlayButton>
              </div>
            )}
            {game.credit && (
              <p className="mt-5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                {game.credit}
              </p>
            )}
          </div>

          {game.screenshot && (
            <div className="relative aspect-[16/10] w-full overflow-hidden border border-[var(--color-line-strong)]">
              <Image
                src={game.screenshot}
                alt="A round of Blind Rank in progress"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover object-left-top"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
