"use client";

import { AnimatePresence, motion, useAnimationControls, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/app/useGame";
import { useVoice, type VoiceStatus } from "@/app/useVoice";
import Result from "./Result";
import Scene from "./Scene";

const thinking: Record<string, string> = {
  gate: "…I'm thinking. Don't rush me.",
  pitch: "*scribbles a note*",
};

export default function Play({ g, stageId, onExit }: { g: Game; stageId: string; onExit: () => void }) {
  const b = g.brief;
  const [text, setText] = useState("");
  const frame = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (g.event === "foul") frame.start({ x: [0, -14, 14, -10, 10, -5, 0], transition: { duration: 0.45 } });
    if (g.event === "critical") frame.start({ scale: [1, 1.025, 1], transition: { duration: 0.4 } });
  }, [g.eventKey, g.event, frame]);

  useEffect(() => {
    if (!g.busy && !g.streaming && !g.outcome) inputRef.current?.focus();
  }, [g.busy, g.streaming, g.outcome]);

  async function sendLine(line: string) {
    setText("");
    if (!(await g.send(line))) setText(line);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    sendLine(text);
  }

  const lastPlayer = g.turns.at(-1)?.player;
  const lowTime = g.timeLeft <= 8;
  const nervous = Math.max(1 - g.turnsLeft / b.turnLimit, lowTime ? 1 - g.timeLeft / 8 : 0);
  const locked = g.busy || g.streaming || !!g.outcome;
  const voice = useVoice({
    characterId: stageId,
    lastLine: g.npcText,
    locked,
    onText: setText,
    onTurn: sendLine,
  });

  return (
    <motion.div animate={frame} className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 p-3 sm:p-5">
      {/* HUD */}
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="btn bg-paper px-3 py-1.5 text-sm font-extrabold" aria-label="Back to stages">
          ← Stages
        </button>
        <div className="font-display text-xl leading-none sm:text-2xl">
          {b.name} <span className="font-sans text-sm font-bold opacity-70">{b.role}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Gauge label={b.progressLabel} value={g.progress} color="var(--mint)" />
        <Gauge label={b.riskLabel} value={g.risk} color="var(--tomato)" />
      </div>

      {/* Stage */}
      <div className="sticker relative h-[46vh] min-h-[280px] w-full overflow-hidden bg-paper sm:h-[52vh]">
        <motion.div className="h-full w-full" animate={{ filter: g.outcome === "lose" ? "grayscale(0.85)" : "grayscale(0)" }}>
          <Scene
            stageId={stageId}
            progress={g.progress}
            risk={g.risk}
            nervous={nervous}
            looking={text.length > 0 && !locked}
            event={g.event}
            eventKey={g.eventKey}
          />
        </motion.div>
        <Flash event={g.event} eventKey={g.eventKey} />
        <TagBurst g={g} />
      </div>

      {/* NPC speech bubble, tail pointing up at the character */}
      <motion.div
        key={g.eventKey}
        initial={{ scale: 0.7, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="sticker relative mr-auto max-w-[92%] origin-top-left bg-paper px-4 py-3 text-base font-bold leading-snug sm:max-w-[75%] sm:text-lg"
        aria-live="polite"
      >
        <span className="absolute -top-[15px] left-10 h-6 w-6 rotate-45 border-l-[3px] border-t-[3px] border-ink bg-paper" />
        <span className="font-display text-sm opacity-60">{b.name.split(" ")[0]} </span>
        {g.busy ? <span className="opacity-60">{thinking[b.mode]}</span> : g.npcText || <Dots />}
      </motion.div>

      {lastPlayer && (
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm border-[3px] border-ink bg-sky px-4 py-2 text-right text-sm font-bold">
          {lastPlayer}
        </p>
      )}

      {/* Input */}
      <form onSubmit={submit} className="flex items-center gap-3">
        <TimerRing left={g.timeLeft} total={b.turnSeconds} paused={locked} />
        <MicButton status={voice.status} onClick={voice.toggle} />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          disabled={!!g.outcome}
          placeholder={g.busy ? "Judging…" : voice.status === "listening" ? "Listening… just talk" : `Say something to ${b.name.split(" ")[0]}`}
          aria-label="Your line"
          className="sticker min-w-0 flex-1 bg-paper px-4 py-3 text-base font-bold placeholder:text-ink/40 focus:outline-none"
        />
        <button disabled={locked || !text.trim()} className="btn bg-bubble px-5 py-3 font-display text-lg">
          Say it
        </button>
      </form>
      <div className="flex items-center justify-between text-sm font-extrabold">
        <Pips left={g.turnsLeft} total={b.turnLimit} />
        <VoiceNote status={voice.status} />
        {g.error && <span className="text-tomato">{g.error}</span>}
      </div>

      <details className="text-sm font-bold">
        <summary className="cursor-pointer opacity-70">Transcript</summary>
        <div className="mt-2 space-y-1.5">
          <p><b>{b.name}:</b> {b.opening}</p>
          {g.turns.map((t, i) => (
            <div key={i}>
              <p><b>You:</b> {t.player} <span className="opacity-60">({t.progress >= 0 ? "+" : ""}{t.progress} / {t.risk >= 0 ? "+" : ""}{t.risk}, {t.ms}ms)</span></p>
              {t.npc && <p><b>{b.name}:</b> {t.npc}</p>}
            </div>
          ))}
        </div>
      </details>

      <AnimatePresence>{g.outcome && !g.streaming && <Result g={g} onExit={onExit} />}</AnimatePresence>
    </motion.div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const n = useSpring(value, { stiffness: 90, damping: 16 });
  const shown = useTransform(n, (v) => Math.round(v));
  useEffect(() => n.set(value), [n, value]);
  return (
    <div>
      <div className="mb-1 flex items-end justify-between font-display text-lg leading-none">
        <span>{label}</span>
        <motion.span key={value} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
          {shown}
        </motion.span>
      </div>
      <div className="sticker h-6 overflow-hidden rounded-full bg-paper !shadow-[3px_3px_0_var(--ink)]">
        <motion.div
          className="h-full rounded-full border-r-[3px] border-ink"
          style={{ background: color }}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 11 }}
        />
      </div>
    </div>
  );
}

function Flash({ event, eventKey }: { event: string; eventKey: number }) {
  if (!eventKey || (event !== "critical" && event !== "foul")) return null;
  return (
    <motion.div
      key={eventKey}
      className="pointer-events-none absolute inset-0"
      style={{ background: event === "critical" ? "#fff" : "var(--tomato)" }}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    />
  );
}

function TagBurst({ g }: { g: Game }) {
  const tags = [...g.lastTags].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 6);
  const big = g.event === "critical" ? "CRITICAL!" : g.event === "foul" ? "FOUL!" : g.event === "repeat" ? "Yawn…" : null;
  return (
    <AnimatePresence>
      {g.eventKey > 0 && (
        <motion.div key={g.eventKey} className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }}>
          {big && (
            <motion.div
              className="absolute left-1/2 top-[38%] -translate-x-1/2 font-display text-5xl sm:text-7xl"
              style={{ color: g.event === "critical" ? "var(--lemon)" : g.event === "foul" ? "var(--tomato)" : "#fff", WebkitTextStroke: "3px var(--ink)" }}
              initial={{ scale: 3, opacity: 0, rotate: -12 }}
              animate={{ scale: [3, 1, 1, 1.1], opacity: [0, 1, 1, 0], rotate: -6 }}
              transition={{ duration: 1.6, times: [0, 0.15, 0.8, 1] }}
            >
              {big}
            </motion.div>
          )}
          {tags.map((t, i) => {
            const good = t.gauge === "progress" ? t.points > 0 : t.points < 0;
            const side = i % 2 ? 1 : -1;
            return (
              <motion.div
                key={t.code + t.gauge}
                className="absolute left-1/2 top-[55%] whitespace-nowrap rounded-full border-[3px] border-ink px-3 py-1 font-display text-sm shadow-[3px_3px_0_var(--ink)] sm:text-base"
                style={{ background: good ? "var(--mint)" : t.gauge === "risk" ? "var(--tomato)" : "#ddd" }}
                initial={{ x: "-50%", y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x: `calc(-50% + ${side * (70 + (i >> 1) * 70)}px)`,
                  y: -60 - (i >> 1) * 42,
                  scale: 1,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ delay: 0.06 * i, duration: 2.2, times: [0, 0.1, 0.8, 1], scale: { type: "spring", stiffness: 400, damping: 14, delay: 0.06 * i } }}
              >
                {t.points > 0 ? "+" : ""}
                {t.points} {t.label}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimerRing({ left, total, paused }: { left: number; total: number; paused: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const low = left <= 8 && !paused;
  return (
    <motion.div
      className="relative grid h-14 w-14 shrink-0 place-items-center"
      animate={low ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={low ? { repeat: Infinity, duration: 0.6 } : {}}
      aria-label={`${left} seconds left`}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx={28} cy={28} r={r} fill="var(--paper)" stroke="var(--ink)" strokeWidth={4} />
        <motion.circle
          cx={28} cy={28} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          stroke={low ? "var(--tomato)" : "var(--sky)"}
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - left / total) }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <span className="relative font-display text-lg">{left}</span>
    </motion.div>
  );
}

function Pips({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${left} of ${total} turns left`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="h-3.5 w-3.5 rounded-full border-[3px] border-ink"
          animate={{ background: i < left ? "var(--bubble)" : "var(--paper)", scale: i < left ? 1 : 0.8 }}
        />
      ))}
      <span className="ml-1">{left} turns left</span>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-2 w-2 rounded-full bg-ink" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }} />
      ))}
    </span>
  );
}

function MicButton({ status, onClick }: { status: VoiceStatus; onClick: () => void }) {
  const live = status === "listening" || status === "checking";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={live}
      aria-label={live ? "Turn microphone off" : "Talk instead of typing"}
      className="btn relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{ background: live ? "var(--tomato)" : "var(--paper)" }}
    >
      {live && (
        <motion.span
          className="absolute inset-0 rounded-full border-[3px] border-tomato"
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
        />
      )}
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="var(--ink)" strokeWidth={2.4} strokeLinecap="round">
        <rect x={9} y={3} width={6} height={11} rx={3} fill={live ? "#fff" : "var(--lemon)"} />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}

function VoiceNote({ status }: { status: VoiceStatus }) {
  const text = {
    off: "",
    listening: "Mic on. Pause when you're done and Jev decides if you've finished.",
    checking: "Jev is checking if you're done…",
    unsupported: "Voice needs Chrome or Edge. Typing still works.",
    blocked: "Mic is blocked. Allow it in the address bar, then tap the mic again.",
  }[status];
  return text ? <span className="text-right opacity-80">{text}</span> : null;
}
