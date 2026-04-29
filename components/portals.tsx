"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const portals = [
  { href: "/ball", num: "01", name: "Ball", desc: "Highlights, recaps, and what I'm working on in the gym." },
  { href: "/build", num: "02", name: "Build", desc: "Stuff I'm making. Code, projects, homeschool deep dives." },
  { href: "/pod", num: "03", name: "Pod", desc: "The podcast. Dad and I talk ball, faith, and what we're into." },
  { href: "/read", num: "04", name: "Read", desc: "Every book I finish. Big Nate, Dog Man, whatever's next." },
  { href: "/games", num: "05", name: "Games", desc: "NBA games. Curated by me.", featured: true },
];

export default function Portals() {
  return (
    <section className="px-6 lg:px-10 py-40 border-t border-[var(--color-line)]">
      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-16">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        The Sections
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--color-line)] border border-[var(--color-line)]">
        {portals.map((p, i) => {
          const featured = (p as { featured?: boolean }).featured === true;
          return (
            <motion.div
              key={p.href}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Link
                href={p.href}
                className={`aspect-square p-8 flex flex-col justify-between relative overflow-hidden group transition-colors duration-400 text-[var(--color-bone)] no-underline ${
                  featured
                    ? "bg-gradient-to-br from-[var(--color-black)] to-[#13110d] hover:from-[var(--color-off-black)] hover:to-[#1a1610]"
                    : "bg-[var(--color-black)] hover:bg-[var(--color-off-black)]"
                }`}
              >
                <div
                  className={`absolute -right-4 -bottom-8 font-[family-name:var(--font-fraunces)] font-black text-[14rem] leading-none tracking-tighter opacity-[0.04] group-hover:opacity-[0.08] transition-all duration-500 pointer-events-none select-none ${
                    featured
                      ? "text-[var(--color-games-yellow)] group-hover:text-[var(--color-games-yellow)]"
                      : "text-[var(--color-bone)] group-hover:text-[var(--color-red)]"
                  }`}
                >
                  {p.num}
                </div>

                <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] tracking-[0.2em] text-[var(--color-mute)] relative z-[1] flex items-center gap-2">
                  {p.num} / {p.name.toUpperCase()}
                  {featured && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-games-yellow)] animate-pulse"
                      aria-label="Live"
                    />
                  )}
                </div>

                <div
                  className={`absolute left-0 top-1/2 w-full h-px scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-600 ease-out z-[1] ${
                    featured ? "bg-[var(--color-games-yellow)]" : "bg-[var(--color-red)]"
                  }`}
                />

                <div className="relative z-[1]">
                  <div
                    className={`font-[family-name:var(--font-fraunces)] font-black text-[clamp(2rem,3.5vw,3rem)] leading-[0.9] tracking-tight transition-[transform,color] duration-400 group-hover:translate-x-1 ${
                      featured
                        ? "group-hover:text-[var(--color-games-yellow)]"
                        : "group-hover:text-[var(--color-red)]"
                    }`}
                  >
                    {p.name}
                  </div>
                  <div className="text-sm text-[var(--color-mute)] leading-relaxed mt-3 max-w-[20ch]">
                    {p.desc}
                  </div>
                </div>

                <div
                  className={`absolute top-8 right-8 font-[family-name:var(--font-jetbrains)] text-xl text-[var(--color-mute)] group-hover:translate-x-1 group-hover:-translate-y-1 transition-[transform,color] duration-400 z-[1] ${
                    featured
                      ? "group-hover:text-[var(--color-games-yellow)]"
                      : "group-hover:text-[var(--color-red)]"
                  }`}
                >
                  ↗
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
