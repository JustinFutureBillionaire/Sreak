"use client";

import { AnimatePresence, motion, useAnimationControls, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/app/useGame";
import { useVoice, type EndCheck, type VoiceStatus } from "@/app/useVoice";
import { GradeStamp, HitBanner, HitCard } from "./Hit";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Camera move per verdict: a punch-in for big hits, a shake for fouls, a slump for misses.
  const grade = g.last?.grade;
  useEffect(() => {
    if (!grade) return;
    const moves = {
      critical: { scale: [1, 1.05, 0.99, 1], transition: { duration: 0.5 } },
      great: { scale: [1, 1.025, 1], transition: { duration: 0.35 } },
      good: { y: [0, -4, 0], transition: { duration: 0.25 } },
      foul: { x: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.5 } },
      backfire: { x: [0, -8, 8, -4, 0], transition: { duration: 0.35 } },
      miss: { y: [0, 6, 0], transition: { duration: 0.4 } },
      yawn: { rotate: [0, -0.6, 0], transition: { duration: 0.8 } },
      ok: undefined,
    }[grade];
    if (moves) frame.start(moves);
  }, [g.eventKey, grade, frame]);

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
  const lowAt = Math.min(15, g.sessionSeconds / 3);
  const nervous = g.timeLeft <= lowAt ? 1 - g.timeLeft / lowAt : 0;
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
      <div className="self-start rounded-2xl border-[3px] border-ink bg-lemon px-4 py-1.5 text-sm font-extrabold sm:text-base">
        Goal: {b.scenario.goal}
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
        <HitBanner turn={g.last} eventKey={g.eventKey} progressLabel={b.progressLabel} />
        <HitCard turn={g.last} eventKey={g.eventKey} progressLabel={b.progressLabel} riskLabel={b.riskLabel} />
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

      {lastPlayer && g.last && (
        <div className="relative ml-auto max-w-[85%]">
          <p className="rounded-2xl rounded-br-sm border-[3px] border-ink bg-sky px-4 py-2 text-right text-sm font-bold">{lastPlayer}</p>
          <motion.div
            key={g.eventKey}
            className="absolute -left-3 -top-4"
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 500, damping: 14 }}
          >
            <GradeStamp grade={g.last.grade} small />
          </motion.div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea
          ref={inputRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter adds a line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!locked && text.trim()) sendLine(text);
            }
          }}
          maxLength={800}
          disabled={!!g.outcome}
          placeholder={g.busy ? "Judging…" : voice.status === "listening" ? "Listening… just talk" : `Say something to ${b.name.split(" ")[0]}`}
          aria-label="Your line"
          className="sticker max-h-60 min-h-16 w-full min-w-0 flex-1 resize-none overflow-y-auto bg-paper px-4 py-3 text-base font-bold leading-snug [field-sizing:content] placeholder:text-ink/40 focus:outline-none"
        />
        {(voice.status === "listening" || voice.status === "checking") && (
          <VoiceStrip status={voice.status} hearing={voice.hearing} check={voice.check} scoring={g.busy} />
        )}
        <div className="flex items-center gap-3">
          <TimerRing left={g.timeLeft} total={g.sessionSeconds} paused={locked} lowAt={lowAt} />
          <MicButton status={voice.status} onClick={voice.toggle} />
          <span className="flex-1" />
  <button disabled={locked || !text.trim()} className="btn bg-bubble px-7 py-3 font-display text-lg">
          Say it
        </button>
        </div>
      </form>
      <div className="flex items-center justify-between text-sm font-extrabold">
        <span>Turn {g.turnsUsed + 1}</span>
        <VoiceNote status={voice.status} />
        {g.error && <span className="text-tomato">{g.error}</span>}
      </div>

      <details className="text-sm font-bold" open>
        <summary className="cursor-pointer opacity-70">Transcript</summary>
        <div className="mt-2 space-y-1.5">
          <p><b>{b.name}:</b> {b.opening}</p>
          {g.turns.map((t, i) => (
            <div key={i}>
              <p>
                <GradeStamp grade={t.grade} small /> <b>You:</b> {t.player}{" "}
                <span className="opacity-60">({t.progress >= 0 ? "+" : ""}{t.progress} / {t.risk >= 0 ? "+" : ""}{t.risk}, {t.ms}ms)</span>
              </p>
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

function TimerRing({ left, total, paused, lowAt }: { left: number; total: number; paused: boolean; lowAt: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const low = left <= lowAt && !paused;
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <motion.div
      className="relative grid h-16 w-16 shrink-0 place-items-center"
      animate={low ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={low ? { repeat: Infinity, duration: 0.6 } : {}}
      aria-label={`${left} seconds left${paused ? ", paused" : ""}`}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx={32} cy={32} r={r} fill="var(--paper)" stroke="var(--ink)" strokeWidth={4} />
        <motion.circle
          cx={32} cy={32} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          stroke={low ? "var(--tomato)" : "var(--sky)"}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - left / total) }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <span className="relative font-display text-base" style={{ opacity: paused ? 0.5 : 1 }}>{label}</span>
    </motion.div>
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
    listening: "",
    checking: "",
    unsupported: "Voice needs Chrome or Edge. Typing still works.",
    blocked: "Mic is blocked. Allow it in the address bar, then tap the mic again.",
  }[status];
  return text ? <span className="text-right opacity-80">{text}</span> : null;
}

// Makes the voice turn-taking visible: hearing you, pause, Jev's call on whether you're done, scoring.
function VoiceStrip({ status, hearing, check, scoring }: { status: VoiceStatus; hearing: boolean; check: EndCheck | null; scoring: boolean }) {
  const pct = check?.p != null ? ` (${Math.round(check.p * 100)}% done)` : "";
  const step = scoring || check?.done ? 3 : status === "checking" ? 2 : hearing ? 1 : 0;
  const msg = scoring
    ? check?.forced
      ? "Long pause, so your statement was sent. Scoring…"
      : `Jev: statement complete${pct}. Scoring…`
    : status === "checking"
      ? "You paused. Jev is checking if your statement is complete…"
      : check && !check.done
        ? `Jev: sounds unfinished${pct}. Keep going.`
        : hearing
          ? "Hearing you. Pause when your point is made."
          : "Listening. Start talking.";
  const steps = ["Listening", "Hearing you", "Jev checks", "Scored"];
  return (
    <div className="rounded-2xl border-[3px] border-ink bg-white px-3 py-2" aria-live="polite">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <motion.span
              className="rounded-full border-2 border-ink px-2 py-0.5"
              animate={{
                background: i === step ? (i === 2 ? "var(--lilac)" : i === 3 ? "var(--mint)" : "var(--sky)") : i < step ? "#e7e1ee" : "#fff",
                scale: i === step ? 1.08 : 1,
              }}
            >
              {label}
            </motion.span>
            {i < steps.length - 1 && <span className="opacity-40">→</span>}
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-sm font-bold" style={{ color: check && !check.done && !scoring ? "#b0620f" : undefined }}>
        {msg}
        {status === "checking" && <Dots />}
      </p>
    </div>
  );
}
