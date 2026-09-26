"use client";

// Hands-free voice turns: live transcript from the browser's speech recognition,
// and after each pause Jev decides whether the player has finished their point.
import { useEffect, useRef, useState } from "react";

const PAUSE_MS = 800; // silence before asking Jev "are they done?"
const HARD_STOP_MS = 2500; // silence after which we send regardless

// Minimal typing; the Web Speech API isn't in TypeScript's DOM lib.
type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecCtor = new () => Rec;

export type VoiceStatus = "off" | "listening" | "checking" | "unsupported" | "blocked";
// What Jev said at the last pause, shown to the player so the endpointing is visible.
export type EndCheck = { done: boolean; p: number | null; forced?: boolean };

export function useVoice(opts: {
  characterId: string;
  lastLine: string;
  locked: boolean; // game is judging/streaming/over: don't listen
  onText: (text: string) => void; // live transcript
  onTurn: (text: string) => void; // Jev says the turn is over
}) {
  const [on, setOn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<EndCheck | null>(null);
  const [hearing, setHearing] = useState(false); // has words in the buffer
  const [problem, setProblem] = useState<"unsupported" | "blocked" | null>(null);
  const rec = useRef<Rec | null>(null);
  const finalText = useRef("");
  const current = useRef("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const o = useRef(opts);
  useEffect(() => {
    o.current = opts;
  });

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = (text: string, why: EndCheck) => {
    clearTimers();
    finalText.current = "";
    current.current = "";
    setCheck(why);
    setHearing(false);
    o.current.onTurn(text);
  };

  async function onPause() {
    const text = current.current.trim();
    if (!text) return;
    setChecking(true);
    try {
      const res = await fetch("/api/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: o.current.characterId, text, lastLine: o.current.lastLine }),
      });
      const { done, p } = await res.json();
      // Only act if nothing new was said while Jev was deciding.
      if (current.current.trim() !== text) return;
      if (done) finish(text, { done: true, p });
      else setCheck({ done: false, p });
    } finally {
      setChecking(false);
    }
  }

  const listening = on && !opts.locked && !problem;
  useEffect(() => {
    if (!listening) return;
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      queueMicrotask(() => setProblem("unsupported"));
      return;
    }
    let alive = true;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      if (!alive) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      current.current = (finalText.current + interim).replace(/\s+/g, " ");
      o.current.onText(current.current);
      setHearing(true);
      setCheck(null); // new words: the last verdict no longer applies
      clearTimers();
      timers.current.push(setTimeout(onPause, PAUSE_MS));
      timers.current.push(setTimeout(() => current.current.trim() && finish(current.current.trim(), { done: true, p: null, forced: true }), HARD_STOP_MS));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setProblem("blocked");
    };
    // Chrome ends continuous sessions on its own every so often; keep it going.
    r.onend = () => {
      if (alive) {
        try {
          r.start();
        } catch {}
      }
    };
    r.start();
    rec.current = r;
    return () => {
      alive = false;
      clearTimers();
      r.onend = null;
      r.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const status: VoiceStatus = problem ?? (!on ? "off" : checking ? "checking" : "listening");
  return {
    status,
    check, // Jev's verdict at the last pause
    hearing,
    toggle: () => {
      setProblem(null);
      setOn((v) => !v);
    },
  };
}
