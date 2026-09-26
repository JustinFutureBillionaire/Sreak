"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { SESSION_OPTIONS, type Stage } from "@/app/useGame";
import Face, { type Look } from "./Face";

const doorStyle: Record<string, { color: string; look: Look; blurb: string }> = {
  "gate-1": {
    color: "#6b4bd8",
    look: { skin: "#f5c59f", shirt: "#3d4fb8", hair: "cap", hairColor: "#c9c3bd", mustache: true },
    blurb: "Talk your way past a night guard.",
  },
  "pitch-1": {
    color: "#2fd4a3",
    look: { skin: "#9a6445", shirt: "#ff7aa8", hair: "curly", hairColor: "#2b1a14", glasses: true },
    blurb: "Win a $50K check from an angel investor.",
  },
};

export function Home({ stages, onPick }: { stages: Stage[]; onPick: (s: Stage) => void }) {
  const [opening, setOpening] = useState<string | null>(null);
  const word = "Sreak".split("");

  function pick(s: Stage) {
    if (opening) return;
    setOpening(s.id);
    setTimeout(() => onPick(s), 650);
  }

  return (
    <main className="dots mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-10 sm:py-14">
      <header className="text-center">
        <h1 className="flex justify-center font-display text-7xl leading-none sm:text-9xl" aria-label="Sreak">
          {word.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              style={{ WebkitTextStroke: "4px var(--ink)", color: ["#ff7aa8", "#4cc3ff", "#fff9f0", "#2fd4a3", "#ff4d5e"][i], textShadow: "6px 6px 0 var(--ink)" }}
              initial={{ y: -140, rotate: -20, opacity: 0 }}
              animate={{ y: 0, rotate: [0, -6, 4, -3][i % 4], opacity: 1 }}
              transition={{ delay: 0.08 * i, type: "spring", stiffness: 260, damping: 12 }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <p className="mt-4 text-lg font-extrabold sm:text-xl">Talk your way through. Every line you say is judged live.</p>
      </header>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {stages.map((s) => {
          const d = doorStyle[s.id];
          return (
            <button key={s.id} onClick={() => pick(s)} className="group text-left [perspective:900px]" aria-label={`${s.brief.modeTitle}: ${d.blurb}`}>
              <div className="sticker relative h-80 overflow-hidden rounded-t-[80px] bg-lemon">
                {/* what's behind the door */}
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle,#fffbe0,var(--lemon))]">
                  <Face look={d.look} progress={70} risk={10} className="h-40" />
                </div>
                <motion.div
                  className="absolute inset-0 origin-left rounded-t-[76px] border-r-[4px] border-ink p-5 transition-transform duration-200 group-hover:[transform:rotateY(-22deg)]"
                  style={{ background: d.color }}
                  animate={opening === s.id ? { rotateY: -100 } : {}}
                  transition={{ type: "spring", stiffness: 70, damping: 12 }}
                >
                  <div className="mx-auto mt-8 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-[4px] border-ink bg-paper">
                    <Face look={d.look} progress={30} risk={40} className="mt-6 h-28" />
                  </div>
                  <div className="absolute right-5 top-1/2 h-5 w-5 rounded-full border-[3px] border-ink bg-lemon" />
                  <div className="absolute inset-x-5 bottom-5">
                    <div className="font-display text-3xl text-paper" style={{ WebkitTextStroke: "2px var(--ink)" }}>
                      {s.brief.modeTitle}
                    </div>
                    <p className="mt-1 text-sm font-extrabold text-paper">{d.blurb}</p>
                  </div>
                </motion.div>
              </div>
            </button>
          );
        })}
        <div className="sticker relative flex h-80 flex-col justify-end rounded-t-[80px] bg-[#e7e1ee] p-5 opacity-80" aria-label="The Intervention, coming soon">
          <div className="absolute left-1/2 top-16 -translate-x-1/2 rotate-[-8deg] rounded-lg border-[3px] border-ink bg-lemon px-3 py-1 font-display">
            Soon
          </div>
          <div className="font-display text-3xl">The Intervention</div>
          <p className="mt-1 text-sm font-extrabold">Talk a friend out of going all-in on a coin, without pushing.</p>
        </div>
      </div>
    </main>
  );
}

export function Briefing({ stage, onStart, onBack }: { stage: Stage; onStart: (seconds: number) => void; onBack: () => void }) {
  const b = stage.brief;
  const [seconds, setSeconds] = useState(120);
  const d = doorStyle[stage.id];
  return (
    <main className="dots mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:py-10">
      <button onClick={onBack} className="btn self-start bg-paper px-3 py-1.5 text-sm font-extrabold">
        ← Doors
      </button>
      <motion.section
        className="sticker grid gap-6 bg-paper p-5 sm:grid-cols-[220px_1fr] sm:p-7"
        initial={{ y: 30, opacity: 0, rotate: 1.5 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="grid h-52 w-52 place-items-center rounded-full border-[4px] border-ink" style={{ background: d.color }}>
            <Face look={d.look} progress={20} risk={35} className="h-48" />
          </div>
          <div className="text-center font-display text-2xl leading-tight">{b.name}</div>
          <div className="text-center text-sm font-extrabold opacity-70">{b.role}</div>
        </div>

        <div>
          <p className="text-sm font-extrabold opacity-60">{b.modeTitle}</p>
          <div className="mt-1 rounded-2xl border-[3px] border-ink bg-lemon px-4 py-3">
            <div className="text-sm font-extrabold">Your goal</div>
            <h2 className="font-display text-2xl leading-tight sm:text-3xl">{b.scenario.goal}</h2>
          </div>
          <h3 className="mt-5 font-display text-xl">Why it matters</h3>
          <p className="mt-1 text-[15px] font-bold">{b.scenario.purpose}</p>
          <h3 className="mt-5 font-display text-xl">What you&apos;re given</h3>
          <ul className="mt-2 space-y-1.5 text-[15px] font-bold">
            {b.scenario.given.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink bg-lemon" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border-[3px] border-dashed border-ink/40 px-3 py-2 text-sm font-bold">
            Fill <b>{b.progressLabel}</b> before time runs out. You lose if <b>{b.riskLabel}</b> hits 100. The clock stops while{" "}
            {b.name.split(" ")[0]} is thinking or talking. Bribes, threats and fake titles backfire.
          </p>
          <h3 className="mt-5 font-display text-xl">Session length</h3>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Session length">
            {SESSION_OPTIONS.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={seconds === s}
                onClick={() => setSeconds(s)}
                className="btn px-4 py-2 font-display text-lg"
                style={{ background: seconds === s ? "var(--sky)" : "var(--paper)" }}
                data-pressed={seconds === s}
              >
                {s < 60 ? `${s} sec` : `${s / 60} min`}
              </button>
            ))}
          </div>
          <button onClick={() => onStart(seconds)} className="btn mt-5 w-full bg-bubble px-6 py-3 font-display text-2xl sm:w-auto">
            {b.mode === "gate" ? "Knock on the door" : "Start the pitch"}
          </button>
        </div>
      </motion.section>
    </main>
  );
}
