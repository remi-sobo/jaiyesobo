import Image from "next/image";

const stats = [
  { label: "Age", value: "9" },
  { label: "Jersey", value: "0", accent: true },
  { label: "Grade", value: "4th" },
];

/**
 * The hero entrance is CSS, not framer-motion, and stays a server component.
 *
 * A JS-driven entrance has to render `opacity: 0` in the server HTML and
 * undo it after hydration. The server can't know whether the visitor prefers
 * reduced motion, so that initial hidden state survives for exactly the
 * people who should never have seen an animation, and for anyone whose JS
 * doesn't run. The keyframes below live inside a
 * `prefers-reduced-motion: no-preference` query, so both cases get the
 * finished layout immediately. Same reasoning as components/site/reveal.tsx.
 */
export default function Hero() {
  return (
    <section className="flex flex-wrap border-t border-[var(--color-line)]">
      <div className="hero-copy flex min-w-0 flex-[1_1_440px] flex-col justify-between gap-12 px-[clamp(20px,4vw,48px)] py-[clamp(36px,5vw,72px)]">
        <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" />
          <span>Est. East Palo Alto · CA</span>
          <span className="h-px w-8 bg-[var(--color-line-strong)]" />
          <span>Vol. 02 · Age 9</span>
        </div>

        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)]">
            · The official site of ·
          </div>

          <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(4.5rem,12vw,11rem)] font-black leading-[0.82] tracking-[-0.045em]">
            Jai<em className="font-normal italic text-[var(--color-red)]">ye</em>
          </h1>

          <p className="mt-8 max-w-[22ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.5rem,3.2vw,2.3rem)] font-black leading-[1.1] tracking-[-0.02em]">
            I play basketball. I make stuff. And I have{" "}
            <em className="font-normal italic text-[var(--color-red)]">some takes.</em>
          </p>

          <p className="mt-6 max-w-[38ch] text-[1rem] leading-[1.7] text-[var(--color-mute)]">
            New columns and On The Court episodes throughout the season.
          </p>
        </div>

        <dl className="flex max-w-[440px] justify-between gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
                {s.label}
              </dt>
              <dd
                className={`mt-2 font-[family-name:var(--font-fraunces)] text-[1.875rem] tracking-[-0.02em] ${
                  s.accent ? "font-normal italic text-[var(--color-red)]" : "font-black"
                }`}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative min-h-[48vh] min-w-0 flex-[1_1_360px] overflow-hidden">
        <div className="hero-photo absolute inset-0">
          <Image
            src="/jaiye-hero.jpg"
            alt="Jaiye Sobo on the beach at Capitola"
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
            priority
            className="object-cover object-[center_30%] [filter:contrast(1.05)_saturate(1.05)]"
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0a0a_0%,transparent_18%,transparent_82%,rgba(10,10,10,0.6)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(10,10,10,0.4)_100%)]" />

        <div className="absolute bottom-6 left-6 flex items-center gap-3">
          <span className="h-px w-4 bg-[var(--color-red)]" />
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[rgba(245,241,234,0.7)]">
            Shot at Capitola Beach
          </span>
        </div>
      </div>
    </section>
  );
}
