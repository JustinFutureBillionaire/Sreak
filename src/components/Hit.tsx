"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Grade, Turn } from "@/app/useGame";

// One look per verdict, used by the banner, the hit card, and the stamps on past lines.
export const GRADES: Record<Grade, { word: string; color: string; text: string; size: number; flash?: string }> = {
  critical: { word: "CRITICAL!", color: "var(--lemon)", text: "var(--ink)", size: 1.25, flash: "#fff" },
  great: { word: "GREAT!", color: "var(--mint)", text: "var(--ink)", size: 1.05, flash: "rgba(47,212,163,.55)" },
  good: { word: "GOOD", color: "#9be8cf", text: "var(--ink)", size: 0.85 },
  ok: { word: "OK", color: "#e7e1ee", text: "var(--ink)", size: 0.7 },
  miss: { word: "MISS", color: "#cfc8da", text: "var(--ink)", size: 0.75 },
  backfire: { word: "BACKFIRE", color: "#ffb3b8", text: "var(--ink)", size: 0.9, flash: "rgba(255,77,94,.35)" },
  foul: { word: "FOUL!", color: "var(--tomato)", text: "#fff", size: 1.2, flash: "var(--tomato)" },
  yawn: { word: "YAWN…", color: "#d9d4e4", text: "var(--ink)", size: 0.85 },
};

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// Center-screen verdict: the word slams in with the progress number under it, then clears.
export function HitBanner({ turn, eventKey, progressLabel }: { turn?: Turn; eventKey: number; progressLabel: string }) {
  const g = turn && GRADES[turn.grade];
  return (
    <AnimatePresence>
      {turn && g && (
        <motion.div key={eventKey} className="pointer-events-none absolute inset-0 grid place-items-center" exit={{ opacity: 0 }}>
          {g.flash && (
            <motion.div className="absolute inset-0" style={{ background: g.flash }} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.55 }} />
          )}
          {turn.grade === "critical" && <Burst />}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 3.2, opacity: 0, rotate: -14 }}
            animate={{ scale: [3.2, 1, 1, 1.08], opacity: [0, 1, 1, 0], rotate: -7 }}
            transition={{ duration: 1.7, times: [0, 0.12, 0.82, 1], ease: "easeOut" }}
          >
            <span
              className="font-display leading-none"
              style={{ fontSize: `${4.4 * g.size}rem`, color: g.color, WebkitTextStroke: "4px var(--ink)", textShadow: "6px 6px 0 var(--ink)" }}
            >
              {g.word}
            </span>
            <span
              className="mt-1 font-display leading-none"
              style={{ fontSize: `${2.4 * g.size}rem`, color: turn.progress > 0 ? "#fff" : "var(--tomato)", WebkitTextStroke: "3px var(--ink)", textShadow: "4px 4px 0 var(--ink)" }}
            >
              {sign(turn.progress)} {progressLabel}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Starburst rays behind a critical.
function Burst() {
  return (
    <motion.svg viewBox="-100 -100 200 200" className="absolute h-[140%] w-[140%]" initial={{ scale: 0.2, rotate: 0, opacity: 1 }} animate={{ scale: 1.2, rotate: 25, opacity: 0 }} transition={{ duration: 0.9 }} aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d="M-6 -20 L0 -100 L6 -20 Z" fill="var(--lemon)" stroke="var(--ink)" strokeWidth={2} transform={`rotate(${(360 / 14) * i})`} />
      ))}
    </motion.svg>
  );
}

// Stays up until the next line: why this line landed the way it did.
export function HitCard({ turn, eventKey, progressLabel, riskLabel }: { turn?: Turn; eventKey: number; progressLabel: string; riskLabel: string }) {
  if (!turn) return null;
  const g = GRADES[turn.grade];
  const reasons = [...turn.tags].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 3);
  return (
    <motion.div
      key={eventKey}
      className="absolute left-2 top-2 w-[58%] max-w-[300px] rounded-2xl border-[3px] border-ink bg-paper/95 p-2.5 shadow-[4px_4px_0_var(--ink)] sm:left-3 sm:top-3"
      initial={{ x: -40, opacity: 0, rotate: -6 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 18 }}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <GradeStamp grade={turn.grade} />
        <div className="text-right font-display text-xs leading-tight sm:text-sm">
          <div style={{ color: turn.progress >= 0 ? "#139a73" : "var(--tomato)" }}>{sign(turn.progress)} {progressLabel}</div>
          <div style={{ color: turn.risk > 0 ? "var(--tomato)" : "#139a73" }}>{sign(turn.risk)} {riskLabel}</div>
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {reasons.map((t) => {
          const good = t.gauge === "progress" ? t.points > 0 : t.points < 0;
          return (
            <li key={t.code + t.gauge} className="flex items-center justify-between gap-2 text-xs font-extrabold sm:text-sm">
              <span className="truncate">{t.label}</span>
              <span className="shrink-0 rounded-full border-2 border-ink px-1.5" style={{ background: good ? "var(--mint)" : "#ffb3b8" }}>
                {sign(t.points)}
              </span>
            </li>
          );
        })}
        {!reasons.length && (
          <li className="text-xs font-bold opacity-70">
            {turn.progress > 0 ? "Small gains, nothing stood out." : "Nothing landed."} Try a reason, a concrete detail, or a question.
          </li>
        )}
      </ul>
      <span className="sr-only">{g.word}</span>
    </motion.div>
  );
}

export function GradeStamp({ grade, small }: { grade: Grade; small?: boolean }) {
  const g = GRADES[grade];
  return (
    <span
      className={`inline-block -rotate-6 rounded-lg border-[3px] border-ink font-display leading-none ${small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-base"}`}
      style={{ background: g.color, color: g.text }}
    >
      {g.word}
    </span>
  );
}
