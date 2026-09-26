"use client";

import { useState } from "react";
import { useGame, type Stage } from "./useGame";

export default function Game({ stages }: { stages: Stage[] }) {
  const [stage, setStage] = useState<Stage | null>(null);
  if (!stage) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {stages.map((s) => (
          <button key={s.id} onClick={() => setStage(s)} className="rounded-xl border p-5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{s.brief.modeTitle} · Stage {s.brief.stage}</div>
            <div className="mt-1 text-lg font-semibold">{s.brief.name}</div>
            <div className="text-sm text-neutral-500">{s.brief.role}</div>
          </button>
        ))}
      </div>
    );
  }
  return <Play key={stage.id} stage={stage} onExit={() => setStage(null)} />;
}

function Play({ stage, onExit }: { stage: Stage; onExit: () => void }) {
  const g = useGame(stage);
  const { brief: b, progress, risk, turns, outcome, busy, error } = g;
  const [text, setText] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (await g.send(text)) setText("");
  }

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onExit} className="self-start text-sm text-neutral-500 hover:underline">← Stages</button>

      <section className="rounded-xl border p-5 text-sm">
        <div className="text-xs uppercase tracking-wide text-neutral-500">{b.modeTitle} · Stage {b.stage}</div>
        <h2 className="mt-1 text-xl font-semibold">{b.name} <span className="font-normal text-neutral-500">— {b.role}</span></h2>
        <dl className="mt-3 grid gap-1 sm:grid-cols-[6rem_1fr]">
          <dt className="text-neutral-500">When</dt><dd>{b.scenario.time}</dd>
          <dt className="text-neutral-500">Where</dt><dd>{b.scenario.place}</dd>
          <dt className="text-neutral-500">You are</dt><dd>{b.scenario.you}</dd>
          <dt className="text-neutral-500">Goal</dt><dd className="font-medium">{b.scenario.goal}</dd>
          <dt className="text-neutral-500">You have</dt>
          <dd><ul className="list-disc pl-5">{b.scenario.youHave.map((f) => <li key={f}>{f}</li>)}</ul></dd>
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Gauge label={b.progressLabel} value={progress} color="bg-emerald-500" />
        <Gauge label={b.riskLabel} value={risk} color="bg-rose-500" />
      </section>
      <div className="text-sm text-neutral-500">Turns left: {g.turnsLeft} / {b.turnLimit} · <span className={g.timeLeft <= 10 ? "font-bold text-rose-600" : ""}>{g.timeLeft}s</span></div>

      <section className="flex flex-col gap-3">
        <Line who={b.name} text={b.opening} />
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Line who="You" text={t.player} />
            <div className="flex flex-wrap gap-1.5 pl-4 text-xs">
              {t.voided && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">Turn voided: out-of-game content</span>}
              {t.tags.map((g) => (
                <span key={g.code + g.gauge} className={`rounded px-2 py-0.5 ${g.gauge === "risk" ? "bg-rose-100 text-rose-900" : g.points > 0 ? "bg-emerald-100 text-emerald-900" : "bg-neutral-200 text-neutral-800"}`}>
                  {g.points > 0 ? "+" : ""}{g.points} {g.label}
                </span>
              ))}
              <span className="text-neutral-400">
                Δ {b.progressLabel} {t.progress >= 0 ? "+" : ""}{t.progress} · Δ {b.riskLabel} {t.risk >= 0 ? "+" : ""}{t.risk} · {t.ms}ms
              </span>
            </div>
            <Line who={b.name} text={t.npc || "…"} muted={!t.npc} />
          </div>
        ))}
      </section>

      {outcome ? (
        <div className={`rounded-xl p-4 text-center font-semibold ${outcome === "win" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>
          {outcome === "win" ? `Cleared! ${"★".repeat(g.stars)}${"☆".repeat(3 - g.stars)}` : "Failed."}{" "}
          <button onClick={g.reset} className="underline">Retry</button>
          {g.reportState === "loading" && <p className="mt-2 text-sm font-normal">Writing your feedback…</p>}
          {g.reportState === "error" && <p className="mt-2 text-sm font-normal">Feedback unavailable.</p>}
          {g.report && (
            <div className="mt-3 space-y-2 text-left text-sm font-normal">
              <p><b>Verdict:</b> {g.report.verdict}</p>
              <p><b>Best moment:</b> “{g.report.bestMoment.quote}” — {g.report.bestMoment.why}</p>
              {g.report.mistakes.map((m) => (
                <p key={m.quote}><b>Mistake:</b> “{m.quote}” — {m.why} <i>Try: “{m.better}”</i></p>
              ))}
              <p><b>Next drill:</b> {g.report.nextDrill}</p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={`Say something to ${b.name}…`}
            aria-label="Your line"
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button disabled={busy || g.streaming} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
            {busy ? "…" : "Say"}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span>{value}</span></div>
      <div className="mt-1 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className={`h-3 rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Line({ who, text, muted }: { who: string; text: string; muted?: boolean }) {
  return (
    <p className={muted ? "text-neutral-400 italic" : ""}>
      <span className="font-semibold">{who}:</span> {text}
    </p>
  );
}
