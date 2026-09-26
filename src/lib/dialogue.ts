import OpenAI from "openai";
import type { Character } from "./characters";
import type { PastTurn } from "./engine";

export const openai = new OpenAI();
export const DIALOGUE_MODEL = "gpt-5-nano";
export const REPORT_MODEL = "gpt-5-mini";

type Mood = { progress: number; risk: number; turnsLeft: number; event: string };

function systemPrompt(c: Character, m: Mood) {
  const b = c.brief;
  const state =
    m.progress >= 100 ? `You are convinced. Give in and say yes, in your own words (${b.progressLabel} is full).`
    : m.risk >= 100 ? `You have had enough. Refuse firmly and end the conversation (${b.riskLabel} is maxed).`
    : m.turnsLeft <= 0 ? "Time is up. Politely end the conversation without agreeing."
    : `Your inner state (never state numbers): ${b.progressLabel} ${m.progress}/100, ${b.riskLabel} ${m.risk}/100. Higher ${b.progressLabel} means you are warming up; higher ${b.riskLabel} means you are more guarded.`;
  const react = {
    critical: "The player just touched on what you are secretly worried about. Let it visibly land on you.",
    foul: "The player just did something out of line (threat, bribe, rudeness, or a lie). React sharply.",
    repeat: "The player is repeating themselves. Call it out, a bit bored.",
    none: "",
  }[m.event] ?? "";
  return [
    `You are ${b.name}, ${b.role}, in a persuasion-training game. Stay fully in character.`,
    c.persona,
    `Scene: ${b.scenario.time} ${b.scenario.place}`,
    `The player: ${b.scenario.you} They want: ${b.scenario.goal}`,
    `Your hidden concern (never say it outright; only hint if asked the right question): ${c.hiddenConcern}`,
    state,
    react,
    "Reply with 1–2 short spoken sentences. You may add one short *action* in asterisks. No lists, no narration of the player.",
  ].filter(Boolean).join("\n");
}

export function streamReply(c: Character, history: PastTurn[], text: string, mood: Mood) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(c, mood) },
    { role: "assistant", content: c.brief.opening },
    ...history.slice(-6).flatMap((t) => [
      { role: "user" as const, content: t.player },
      ...(t.npc ? [{ role: "assistant" as const, content: t.npc }] : []),
    ]),
    { role: "user", content: text },
  ];
  return openai.chat.completions.create({
    model: DIALOGUE_MODEL,
    reasoning_effort: "minimal",
    max_completion_tokens: 200,
    stream: true,
    messages,
  });
}

// Used when OpenAI is down so the demo never stalls.
export function fallbackReply(c: Character, mood: Mood) {
  const f = c.fallback;
  if (mood.progress >= 100) return f.win;
  if (mood.risk >= 100 || mood.turnsLeft <= 0) return f.lose;
  if (mood.event === "foul") return f.foul;
  return mood.progress >= mood.risk ? f.warm : f.cold;
}
