"use client";

// Contract between game logic (A) and visuals (B). Components render only from this hook.
import { useState } from "react";
import type { Brief } from "@/lib/characters";
import type { PastTurn, Tag } from "@/lib/engine";

export type Stage = { id: string; brief: Brief };
export type Turn = PastTurn & { progress: number; risk: number; tags: Tag[]; voided: boolean; ms: number };
// What the last judged line was, for big one-shot effects (flash, shake, yawn).
export type GameEvent = "critical" | "foul" | "repeat" | "none";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function eventOf(t: Turn | undefined): GameEvent {
  if (!t) return "none";
  const pts = (code: string) => t.tags.find((g) => g.code === code)?.points ?? 0;
  if (t.voided || pts("R1") >= 10 || pts("R2") >= 10 || pts("R6") >= 10) return "foul";
  if (pts("C6") >= 8) return "critical";
  if (pts("R4") <= -4) return "repeat";
  return "none";
}

export function useGame(stage: Stage) {
  const b = stage.brief;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const progress = clamp(turns.reduce((s, t) => clamp(s + t.progress), 0));
  const risk = clamp(turns.reduce((s, t) => clamp(s + t.risk), 0));
  const turnsLeft = b.turnLimit - turns.filter((t) => !t.voided).length;
  const outcome: "win" | "lose" | null = progress >= 100 ? "win" : risk >= 100 || turnsLeft <= 0 ? "lose" : null;
  const last = turns.at(-1);

  async function send(text: string) {
    if (!text.trim() || busy || outcome) return false;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: stage.id, text, history: turns.map(({ player, npc, tag }) => ({ player, npc, tag })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setTurns((ts) => [...ts, { player: text, tag: data.tag, progress: data.progress, risk: data.risk, tags: data.tags, voided: data.voided, ms: data.ms }]);
      return true;
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    brief: b,
    progress, // 0–100
    risk, // 0–100
    turnsLeft,
    timeLeft: null as number | null, // seconds left this turn; null until the timer lands
    turns,
    lastTags: last?.tags ?? [],
    event: eventOf(last),
    eventKey: turns.length, // changes every turn, use as a React key to replay effects
    npcText: last?.npc ?? b.opening, // streams in once GPT dialogue lands
    outcome,
    busy,
    error,
    send,
    reset: () => setTurns([]),
  };
}

export type Game = ReturnType<typeof useGame>;
