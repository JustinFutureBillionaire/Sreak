import type { Character } from "./characters";
import { openai, REPORT_MODEL } from "./dialogue";

export type Report = {
  verdict: string;
  bestMoment: { quote: string; why: string };
  mistakes: { quote: string; why: string; better: string }[];
  nextDrill: string;
};

type LoggedTurn = { player: string; npc?: string; progress: number; risk: number; tags: { label: string; points: number; gauge: string }[] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "bestMoment", "mistakes", "nextDrill"],
  properties: {
    verdict: { type: "string", description: "One sentence on why the player won or lost." },
    bestMoment: {
      type: "object",
      additionalProperties: false,
      required: ["quote", "why"],
      properties: { quote: { type: "string" }, why: { type: "string", description: "Which principle made it work on this character." } },
    },
    mistakes: {
      type: "array",
      description: "Up to 3 weakest lines.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "why", "better"],
        properties: {
          quote: { type: "string" },
          why: { type: "string" },
          better: { type: "string", description: "A rewritten line the player could have said instead." },
        },
      },
    },
    nextDrill: { type: "string", description: "One concrete thing to try on the next attempt." },
  },
} as const;

export async function generateReport(c: Character, outcome: string, turns: LoggedTurn[]): Promise<Report> {
  const log = turns.map((t, i) => ({
    turn: i + 1,
    player: t.player,
    character: t.npc,
    progress_delta: t.progress,
    risk_delta: t.risk,
    judged: t.tags.map((g) => `${g.points > 0 ? "+" : ""}${g.points} ${g.label} (${g.gauge})`),
  }));
  const res = await openai.chat.completions.create({
    model: REPORT_MODEL,
    reasoning_effort: "low",
    response_format: { type: "json_schema", json_schema: { name: "report", strict: true, schema } },
    messages: [
      {
        role: "system",
        content:
          "You are a warm, sharp persuasion coach reviewing one round of a persuasion-training game. " +
          "The judged scores come from a rubric model; interpret them, don't repeat them. Quote the player's exact words. " +
          "Favor ethical persuasion: never praise threats, bribes, or lies. Keep every field short (1–2 sentences).",
      },
      {
        role: "user",
        content: JSON.stringify({
          character: { name: c.brief.name, role: c.brief.role, personality: c.persona, hidden_concern: c.hiddenConcern },
          player_goal: c.brief.scenario.goal,
          outcome,
          turns: log,
        }),
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content ?? "{}");
}
