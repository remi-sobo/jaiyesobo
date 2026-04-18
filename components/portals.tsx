"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const portals = [
  { href: "/ball", num: "01", name: "Ball", desc: "Highlights, recaps, and what I'm working on in the gym." },
  { href: "/build", num: "02", name: "Build", desc: "Stuff I'm making. Code, projects, homeschool deep dives." },
  { href: "/pod", num: "03", name: "Pod", desc: "The podcast. Dad and I talk ball, faith, and what we're into." },
  { href: "/read", num: "04", name: "Read", desc: "Every book I finish. Big Nate, Dog Man, whatever's next." },
];

export default function Portals() {
  return (
    <section className="px-6 lg:px-10 py-40 border-t border-[var(--color-line)]">
      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-16">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        The Sections
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-line)] border border-[var(--color-line)]">
        {portals.map((p, i) => (
          <motion.div key={p.href} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
            <Link href={p.href} className="bg-[var(--color-black)] aspect-square p-8 flex flex-col justify-between relative overflow-hidden group hover:bg-[var(--color-off-black)] transition-colors duration-400 text-[var(--color-bone)] no-underline">
              <div className="absolute -right-4 -bottom-8 font-[family-name:var(--font-fraunces)] font-black text-[14rem] leading-none tracking-tighter text-[var(--color-bone)] opacity-[0.04] group-hover:opacity-[0.08] group-hover:text-[var(--color-red)] transition-all duration-500 pointer-events-none select-none">
                {p.num}
              </div>

              <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] tracking-[0.2em] text-[var(--color-mute)] relative z-[1]">
                {p.num} / {p.name.toUpperCase()}
              </div>

              <div className="absolute left-0 top-1/2 w-full h-px bg-[var(--color-red)] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-600 ease-out z-[1]" />

              <div className="relative z-[1]">
                <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,4vw,3.5rem)] leading-[0.9] tracking-tight transition-[transform,color] duration-400 group-hover:text-[var(--color-red)] group-hover:translate-x-1">
                  {p.name}
                </div>
                <div className="text-sm text-[var(--color-mute)] leading-relaxed mt-3 max-w-[20ch]">{p.desc}</div>
              </div>

              <div className="absolute top-8 right-8 font-[family-name:var(--font-jetbrains)] text-xl text-[var(--color-mute)] group-hover:text-[var(--color-red)] group-hover:translate-x-1 group-hover:-translate-y-1 transition-[transform,color] duration-400 z-[1]">
                ↗
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
