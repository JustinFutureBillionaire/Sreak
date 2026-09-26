"use client";

// Contract between game logic (A) and visuals (B). Components render only from this hook.
import { useEffect, useRef, useState } from "react";
import type { Brief } from "@/lib/characters";
import type { GameEvent, PastTurn, Tag } from "@/lib/engine";
import type { Report } from "@/lib/report";

export type { GameEvent, Report };
export type Stage = { id: string; brief: Brief };
export type Turn = PastTurn & {
  progress: number;
  risk: number;
  tags: Tag[];
  voided: boolean;
  event: GameEvent;
  ms: number;
  timedOut?: boolean;
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const TIMEOUT_RISK = 10;

export function useGame(stage: Stage) {
  const b = stage.brief;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false); // waiting for Jev
  const [streaming, setStreaming] = useState(false); // NPC line still arriving
  const [error, setError] = useState("");
  const [turnStart, setTurnStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [report, setReport] = useState<Report | null>(null);
  const [reportFailed, setReportFailed] = useState(false);

  const played = turns.filter((t) => !t.voided);
  const progress = clamp(turns.reduce((s, t) => clamp(s + t.progress), 0));
  const risk = clamp(turns.reduce((s, t) => clamp(s + t.risk), 0));
  const turnsLeft = b.turnLimit - played.length;
  const outcome: "win" | "lose" | null = progress >= 100 ? "win" : risk >= 100 || turnsLeft <= 0 ? "lose" : null;
  const last = turns.at(-1);
  const fouls = turns.filter((t) => t.event === "foul").length;
  // Clear / turn efficiency (used at most half the turns) / zero fouls.
  const stars = outcome === "win" ? 1 + (played.length <= Math.ceil(b.turnLimit / 2) ? 1 : 0) + (fouls === 0 ? 1 : 0) : 0;

  // Per-turn countdown. Only ticks while the player is on the clock; restarts after every turn.
  const paused = busy || streaming || !!outcome;
  const timeLeft = paused ? b.turnSeconds : Math.min(b.turnSeconds, Math.max(0, b.turnSeconds - Math.floor((now - turnStart) / 1000)));
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - turnStart < b.turnSeconds * 1000) return;
      setTurnStart(t);
      setTurns((ts) => [
        ...ts,
        {
          player: "(stayed silent)",
          npc: b.mode === "gate" ? "Hello? You gonna say something or not?" : "*checks her watch* ...Still there?",
          progress: 0,
          risk: TIMEOUT_RISK,
          tags: [{ code: "T", label: "Too slow", points: TIMEOUT_RISK, gauge: "risk" }],
          voided: false,
          event: "none",
          ms: 0,
          timedOut: true,
        },
      ]);
    }, 250);
    return () => clearInterval(id);
  }, [paused, turnStart, b.turnSeconds, b.mode]);

  // Fetch the feedback report once the stage ends.
  const reportDone = !!outcome && !streaming;
  const reportState = !reportDone || report ? "idle" : reportFailed ? "error" : "loading";
  const reported = useRef(false);
  useEffect(() => {
    if (!reportDone || reported.current) return;
    reported.current = true;
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: stage.id, outcome, turns }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setReport)
      .catch(() => setReportFailed(true));
  }, [reportDone, outcome, turns, stage.id]);

  async function send(text: string) {
    if (!text.trim() || busy || streaming || outcome) return false;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: stage.id,
          text,
          progress,
          risk,
          history: played.map(({ player, npc, tag }) => ({ player, npc, tag })),
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines.filter(Boolean)) {
          const msg = JSON.parse(line);
          if (msg.type === "judge") {
            // Gauges and face react now; dialogue follows.
            setTurns((ts) => [...ts, { player: text, npc: "", tag: msg.tag, progress: msg.progress, risk: msg.risk, tags: msg.tags, voided: msg.voided, event: msg.event, ms: msg.ms }]);
            setBusy(false);
            setStreaming(true);
          } else if (msg.type === "reply") {
            setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, npc: (t.npc ?? "") + msg.delta } : t)));
          }
        }
      }
      return true;
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      return false;
    } finally {
      setBusy(false);
      setStreaming(false);
      setTurnStart(Date.now());
    }
  }

  function reset() {
    setTurns([]);
    setReport(null);
    setReportFailed(false);
    setError("");
    setTurnStart(Date.now());
    reported.current = false;
  }

  return {
    brief: b,
    progress, // 0–100
    risk, // 0–100
    turnsLeft,
    timeLeft, // seconds left this turn
    turns,
    lastTags: last?.tags ?? [],
    event: last?.event ?? ("none" as GameEvent),
    eventKey: turns.length, // changes every turn, use as a React key to replay effects
    npcText: last ? last.npc ?? "" : b.opening,
    busy, // Jev is judging
    streaming, // NPC reply is arriving
    outcome,
    stars, // 0–3, only after a win
    report, // feedback report after the stage ends
    reportState,
    error,
    send,
    reset,
  };
}

export type Game = ReturnType<typeof useGame>;
