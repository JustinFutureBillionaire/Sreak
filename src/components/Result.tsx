"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useEffect } from "react";
import type { Game } from "@/app/useGame";

const titles = {
  gate: { win: "The door's open!", lose: "Door stays shut." },
  pitch: { win: "Dana's in for $50K!", lose: "It's a pass." },
};

export default function Result({ g, onExit }: { g: Game; onExit: () => void }) {
  const win = g.outcome === "win";
  const title = titles[g.brief.mode][win ? "win" : "lose"];

  useEffect(() => {
    if (!win || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ff7aa8", "#ffd23f", "#2fd4a3", "#4cc3ff", "#b9a6ff"];
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors });
    const t = setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors });
    }, 450);
    return () => clearTimeout(t);
  }, [win]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        className="sticker my-8 w-full max-w-xl bg-paper p-5 sm:p-7"
        initial={{ scale: 0.5, rotate: -4, y: 40 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        <h2 className="text-center font-display text-4xl leading-tight sm:text-5xl" style={{ color: win ? "var(--ink)" : "var(--tomato)" }}>
          {title}
        </h2>

        <div className="my-4 flex justify-center gap-3" aria-label={`${g.stars} of 3 stars`}>
          {[0, 1, 2].map((i) => {
            const on = i < g.stars;
            return (
              <motion.svg
                key={i}
                viewBox="0 0 24 24"
                className="h-14 w-14"
                initial={{ scale: 3, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.35 + i * 0.3, type: "spring", stiffness: 300, damping: 12 }}
              >
                <path
                  d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
                  fill={on ? "var(--lemon)" : "#e7e1ee"}
                  stroke="var(--ink)"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                />
              </motion.svg>
            );
          })}
        </div>
        <p className="text-center text-sm font-bold opacity-70">Clear · finish in half the turns · no fouls</p>

        <div className="mt-5 space-y-3 text-[15px] leading-relaxed">
          {g.reportState === "loading" && (
            <motion.p className="text-center font-bold" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}>
              Your coach is reading the tape…
            </motion.p>
          )}
          {g.reportState === "error" && <p className="text-center font-bold">The coach&apos;s notes didn&apos;t load. Play again to get a fresh report.</p>}
          {g.report && (
            <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <p className="font-extrabold">{g.report.verdict}</p>
              <Card color="var(--mint)" title="Best line">
                <q className="font-bold">{g.report.bestMoment.quote}</q>
                <p className="mt-1">{g.report.bestMoment.why}</p>
              </Card>
              {g.report.mistakes.map((m, i) => (
                <Card key={i} color="var(--bubble)" title="Could be sharper">
                  <q className="font-bold">{m.quote}</q>
                  <p className="mt-1">{m.why}</p>
                  <p className="mt-1.5 rounded-lg bg-white/70 px-2 py-1">
                    <b>Try:</b> {m.better}
                  </p>
                </Card>
              ))}
              <Card color="var(--sky)" title="Next time">
                {g.report.nextDrill}
              </Card>
            </motion.div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={g.reset} className="btn bg-lemon px-5 py-2.5 font-display text-lg">
            Play again
          </button>
          <button onClick={onExit} className="btn bg-paper px-5 py-2.5 font-display text-lg">
            Pick another stage
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Card({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-[3px] border-ink p-3" style={{ background: `color-mix(in srgb, ${color} 28%, white)` }}>
      <div className="mb-1 font-display text-base">{title}</div>
      {children}
    </div>
  );
}
