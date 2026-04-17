"use client";
import { motion } from "framer-motion";

const items = [
  { label: "Reading", content: "Dog Man: ", highlight: "Mothering Heights", tail: "" },
  { label: "Building", content: "This website, with Dad.", highlight: "", tail: "" },
  { label: "Watching", content: "Old ", highlight: "Kobe", tail: " mixtapes on YouTube." },
  { label: "Working On", content: "My left hand. And a cleaner jumper.", highlight: "", tail: "" },
];

export default function NowStrip() {
  return (
    <section id="now" className="px-6 lg:px-10 py-24 border-t border-[var(--color-line)] bg-[var(--color-off-black)]">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_3fr] gap-12 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h3 className="font-[family-name:var(--font-fraunces)] font-black text-5xl leading-[0.9] tracking-tight mb-4">
            Right
            <br />
            <span className="text-[var(--color-red)] italic font-normal">now.</span>
          </h3>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
            Updated Apr 15
          </div>
        </motion.div>

        <div className="flex flex-col gap-6">
          {items.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} className="grid lg:grid-cols-[120px_1fr] gap-6 lg:gap-8 pb-6 border-b border-[var(--color-line)] last:border-none">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)] pt-2">
                {item.label}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl leading-snug tracking-tight">
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
