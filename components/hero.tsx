"use client";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const NAME = "Jaiye";

export default function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] overflow-hidden bg-[var(--color-black)]">
      <div className="relative flex flex-col justify-between px-6 lg:px-12 pt-28 pb-20 lg:pb-24 z-[5]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.2 }} className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-mute)]">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]"
            animate={reduced ? { opacity: 1, scale: 1 } : { opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
            transition={reduced ? { duration: 0 } : { duration: 1.6, repeat: Infinity }}
          />
          <span>EST. EAST PALO ALTO · CA</span>
          <span className="w-8 h-px bg-[var(--color-line)]" />
          <span>Vol. 01 · 2026</span>
        </motion.div>

        <div className="py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.5 }} className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-red)] mb-6">
            — The official site of —
          </motion.div>

          <h1 className="font-[family-name:var(--font-fraunces)] font-black leading-[0.82] tracking-[-0.045em] text-[clamp(5rem,14vw,13rem)]">
            {NAME.split("").map((char, i) => {
              const isItalic = i >= 3;
              return (
                <motion.span key={i} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.7 + i * 0.08, ease: [0.19, 1, 0.22, 1] }} className={`inline-block ${isItalic ? "italic font-normal text-[var(--color-red)]" : ""}`}>
                  {char}
                </motion.span>
              );
            })}
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.3 }} className="font-[family-name:var(--font-fraunces)] italic text-[clamp(1rem,1.4vw,1.35rem)] text-[var(--color-mute)] mt-10 max-w-[36ch] leading-snug">
            Just a kid from East Palo Alto. <span className="not-italic font-semibold text-[var(--color-bone)]">Ballin&apos;</span> + <span className="not-italic font-semibold text-[var(--color-bone)]">Buildin&apos;</span>.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.5 }} className="flex justify-between items-end max-w-md font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-mute)]">
          <Stat label="Age" value="8" />
          <Stat label="Jersey" value="23" accent />
          <Stat label="Grade" value="3rd" />
        </motion.div>
      </div>

      <div className="relative overflow-hidden bg-black min-h-[60vh] lg:min-h-full">
        <motion.div initial={{ clipPath: "inset(0 0 100% 0)", scale: 1.2 }} animate={{ clipPath: "inset(0 0 0% 0)", scale: 1.08 }} transition={{ duration: reduced ? 0 : 1.6, delay: reduced ? 0 : 0.3, ease: [0.19, 1, 0.22, 1] }} className="absolute inset-0">
          <motion.div
            animate={reduced ? { scale: 1.08, x: "0%", y: "0%" } : { scale: [1.08, 1.12], x: ["0%", "-1%"], y: ["0%", "-2%"] }}
            transition={reduced ? { duration: 0 } : { duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image src="/jaiye-hero.jpg" alt="Jaiye Sobo at Capitola Beach" fill priority className="object-cover object-[center_30%] contrast-[1.05] saturate-[1.05]" />
          </motion.div>
        </motion.div>

        <div className="absolute inset-0 pointer-events-none z-[2] bg-[linear-gradient(90deg,var(--color-black)_0%,transparent_18%,transparent_82%,rgba(10,10,10,0.6)_100%),linear-gradient(180deg,transparent_60%,rgba(10,10,10,0.4)_100%)]" />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.7 }} className="absolute top-1/2 right-6 -translate-y-1/2 [writing-mode:vertical-rl] font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.3em] text-[rgba(245,241,234,0.5)] z-[4] flex gap-6 items-center">
          <span>No. 23</span>
          <span className="w-px h-8 bg-[var(--color-red)]" />
          <span>Jordan Brand</span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.9 }} className="absolute bottom-8 left-8 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[rgba(245,241,234,0.7)] z-[4] flex items-center gap-3">
          <span className="w-4 h-px bg-[var(--color-red)]" />
          <span>Shot at Capitola Beach</span>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 1.8 }} className="absolute bottom-8 left-[30%] -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-mute)] z-[6]">
        Scroll
        <span className="w-px h-10 bg-gradient-to-b from-[var(--color-mute)] to-transparent" />
      </motion.div>

      {!reduced && <BasketballArc />}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div>{label}</div>
      <span className={`font-[family-name:var(--font-fraunces)] font-black text-3xl tracking-tight text-[var(--color-bone)] block mt-1 ${accent ? "italic font-normal text-[var(--color-red)]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function BasketballArc() {
  const duration = 1.6;
  const delay = 2.2;
  return (
    <div className="absolute inset-0 pointer-events-none z-[10] overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <motion.path
          d="M 5 75 Q 50 0 95 45"
          stroke="var(--color-red-bright)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.9, 0.9, 0] }}
          transition={{
            pathLength: { duration, delay, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: duration + 0.6, delay, times: [0, 0.12, 0.75, 1] },
          }}
        />
      </svg>
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-[var(--color-red-bright)] shadow-[0_0_16px_var(--color-red-bright),0_0_32px_var(--color-red)]"
        initial={{ left: "5%", top: "75%", x: "-50%", y: "-50%", opacity: 0, scale: 0.6 }}
        animate={{
          left: ["5%", "18%", "32%", "50%", "68%", "82%", "95%"],
          top: ["75%", "55%", "41%", "30%", "29%", "34%", "45%"],
          x: "-50%",
          y: "-50%",
          opacity: [0, 1, 1, 1, 1, 1, 0],
          scale: [0.6, 1, 1, 1, 1, 1, 0.8],
        }}
        transition={{
          duration,
          delay,
          ease: [0.4, 0, 0.2, 1],
          times: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
        }}
      />
    </div>
  );
}
