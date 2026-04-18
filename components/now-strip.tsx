"use client";
import { motion } from "framer-motion";

const items = [
  { label: "Reading", content: "", highlight: "Big Nate", tail: "." },
  { label: "Building", content: "This website, with ", highlight: "my dad", tail: "." },
  { label: "Watching", content: "", highlight: "Jesser", tail: " videos on YouTube." },
  { label: "Working On", content: "Baseline drive to the ", highlight: "inside reverse", tail: "." },
];

export default function NowStrip() {
  return (
    <section id="now" className="px-6 lg:px-10 py-32 lg:py-40 border-t border-[var(--color-line)] bg-[var(--color-off-black)]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_3fr] gap-16 lg:gap-20 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)] mb-8">
            <span className="w-8 h-px bg-[var(--color-red)]" />
            Status
          </div>
          <h3 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(3rem,5vw,4rem)] leading-[0.9] tracking-tight mb-6">
            Right
            <br />
            <span className="text-[var(--color-red)] italic font-normal">now.</span>
          </h3>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Updated Apr 17
          </div>
        </motion.div>

        <div className="flex flex-col gap-8">
          {items.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} className="grid lg:grid-cols-[140px_1fr] gap-3 lg:gap-10 pb-8 border-b border-[var(--color-line)] last:border-none last:pb-0">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)] pt-2">
                {item.label}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-[1.75rem] lg:text-[2rem] leading-snug tracking-tight">
                {item.content}
                {item.highlight && <em className="text-[var(--color-red)] italic">{item.highlight}</em>}
                {item.tail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
