import Link from "next/link";

const links = [
  { href: "/column", label: "Column" },
  { href: "/pod", label: "Pod" },
  { href: "/games", label: "Games" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
  { href: "/feed.xml", label: "Feed" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] px-5 py-[clamp(52px,7vw,104px)] min-[760px]:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          jaiyesobo.com
        </div>

        <div className="mt-6 font-[family-name:var(--font-fraunces)] text-[clamp(2.6rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.04em]">
          Ballin&apos;
          <br />
          <span className="font-normal italic text-[var(--color-red)]">
            + Buildin&apos;.
          </span>
        </div>

        <ul className="mt-12 flex flex-wrap gap-x-7 gap-y-3 list-none font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em]">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-block py-1 text-[var(--color-mute)] transition-colors duration-300 hover:text-[var(--color-red)]"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-line)] pt-7 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-mute)] sm:flex-row sm:justify-between">
          <div>Vol. 02 · 2026 · East Palo Alto</div>
          <div>Built with Dad</div>
        </div>
      </div>
    </footer>
  );
}
