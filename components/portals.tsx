"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const portals = [
  { href: "/ball", num: "01", name: "Ball", desc: "Highlights, recaps, and what I'm working on in the gym." },
  { href: "/build", num: "02", name: "Build", desc: "Stuff I'm making. Code, projects, homeschool deep dives." },
  { href: "/pod", num: "03", name: "Pod", desc: "The podcast. Dad and I talk ball, faith, and what we're into." },
  { href: "/read", num: "04", name: "Read", desc: "Every book I finish. Dog Man, chapter books, whatever's next." },
];

export default function Portals() {
  return (
    <section className="px-6 lg:px-10 py-32 border-t border-[var(--color-line)]">
      <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-12">
        <span className="w-8 h-px bg-[var(--color-red)]" />
        The Sections
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-line)] border border-[var(--color-line)]">
        {portals.map((p, i) => (
          <motion.div key={p.href} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
            <Link href={p.href} className="bg-[var(--color-black)] aspect-[3/4] p-8 flex flex-col justify-between relative overflow-hidden group hover:bg-[var(--color-off-black)] transition-colors duration-400 text-[var(--color-bone)] no-underline">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] tracking-[0.2em] text-[var(--color-mute)]">
                {p.num} / {p.name.toUpperCase()}
              </div>
              <div>
                <div className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(2.5rem,4vw,3.5rem)] leading-[0.9] tracking-tight transition-[transform,color] duration-400 group-hover:text-[var(--color-red)] group-hover:translate-x-1">
                  {p.name}
                </div>
                <div className="text-sm text-[var(--color-mute)] leading-relaxed mt-2">{p.desc}</div>
              </div>
              <div className="absolute top-8 right-8 font-[family-name:var(--font-jetbrains)] text-xl text-[var(--color-mute)] group-hover:text-[var(--color-red)] group-hover:translate-x-1 group-hover:-translate-y-1 transition-[transform,color] duration-400">
                ↗
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
