"use client";

// Contract between game logic (A) and visuals (B). Components render only from this hook.
import { useEffect, useRef, useState } from "react";
import type { Brief } from "@/lib/characters";
import type { GameEvent, PastTurn, Tag } from "@/lib/engine";
import type { Report } from "@/lib/report";

export type { GameEvent, Report };
export type Stage = { id: string; brief: Brief };
// How one line landed. Every turn gets one, so every line has a visible verdict.
export type Grade = "critical" | "great" | "good" | "ok" | "miss" | "backfire" | "foul" | "yawn";
export function gradeOf(t: { progress: number; risk: number; event: GameEvent; voided: boolean }): Grade {
  if (t.voided || t.event === "foul") return "foul";
  if (t.event === "critical") return "critical";
  if (t.event === "repeat") return "yawn";
  if (t.progress < 0 || t.risk >= 15) return "backfire";
  if (t.progress >= 30) return "great";
  if (t.progress >= 15) return "good";
  if (t.progress >= 5) return "ok";
  return "miss";
}

export type Turn = PastTurn & {
  progress: number;
  risk: number;
  tags: Tag[];
  voided: boolean;
  event: GameEvent;
  grade: Grade;
  ms: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export const SESSION_OPTIONS = [30, 60, 120, 300]; // seconds

export function useGame(stage: Stage, sessionSeconds: number) {
  const b = stage.brief;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false); // waiting for Jev
  const [streaming, setStreaming] = useState(false); // NPC line still arriving
  const [error, setError] = useState("");
  // Session clock: counts only while the player is on the clock (paused while Jev judges and the NPC talks).
  const [spentMs, setSpentMs] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [reportFailed, setReportFailed] = useState(false);

  const played = turns.filter((t) => !t.voided);
  const progress = clamp(turns.reduce((s, t) => clamp(s + t.progress), 0));
  const risk = clamp(turns.reduce((s, t) => clamp(s + t.risk), 0));
  const timeLeft = Math.max(0, Math.ceil(sessionSeconds - spentMs / 1000));
  const outcome: "win" | "lose" | null = progress >= 100 ? "win" : risk >= 100 || timeLeft <= 0 ? "lose" : null;
  const last = turns.at(-1);
  const fouls = turns.filter((t) => t.event === "foul").length;
  // Clear / fast (at most half the session) / zero fouls.
  const stars = outcome === "win" ? 1 + (spentMs / 1000 <= sessionSeconds / 2 ? 1 : 0) + (fouls === 0 ? 1 : 0) : 0;

  const paused = busy || streaming || !!outcome;
  useEffect(() => {
    if (paused) return;
    let last = Date.now();
    const id = setInterval(() => {
      const t = Date.now();
      setSpentMs((ms) => ms + (t - last));
      last = t;
    }, 200);
    return () => clearInterval(id);
  }, [paused]);

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
            setTurns((ts) => [...ts, { player: text, npc: "", tag: msg.tag, progress: msg.progress, risk: msg.risk, tags: msg.tags, voided: msg.voided, event: msg.event, grade: gradeOf(msg), ms: msg.ms }]);
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
    }
  }

  function reset() {
    setTurns([]);
    setReport(null);
    setReportFailed(false);
    setError("");
    setSpentMs(0);
    reported.current = false;
  }

  return {
    brief: b,
    progress, // 0–100
    risk, // 0–100
    turnsUsed: played.length,
    sessionSeconds,
    timeLeft, // seconds left in the session
    turns,
    lastTags: last?.tags ?? [],
    event: last?.event ?? ("none" as GameEvent),
    last, // the last judged turn: grade, deltas, tags
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
