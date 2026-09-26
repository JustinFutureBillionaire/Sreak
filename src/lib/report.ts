import type { Character } from "./characters";
import { openai } from "./clients";
import { countHabits, type Habit } from "./delivery";
import { REPORT_MODEL } from "./dialogue";

export type Point = { quote: string; note: string };
export type Report = { strengths: Point[]; improvements: Point[]; habits: Habit[] };

type LoggedTurn = { player: string; npc?: string; progress: number; risk: number; tags: { label: string; points: number; gauge: string }[] };

const point = {
  type: "object",
  additionalProperties: false,
  required: ["quote", "note"],
  properties: {
    quote: { type: "string", description: "The player's exact words (a line or a short excerpt of one)." },
    note: { type: "string", description: "One short sentence." },
  },
} as const;
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["strengths", "improvements"],
  properties: {
    strengths: { type: "array", description: "1–3 things the player did well, and why it worked on this character.", items: point },
    improvements: { type: "array", description: "1–4 things to improve, each with what to do instead. Include delivery problems (filler words, hedging, apologizing, rambling) as well as persuasion problems.", items: point },
  },
} as const;

export async function generateReport(c: Character, outcome: string, turns: LoggedTurn[]): Promise<Report> {
  const habits = countHabits(turns.map((t) => t.player));
  const log = turns.map((t, i) => ({
    turn: i + 1,
    player: t.player,
    character: t.npc,
    progress_delta: t.progress,
    risk_delta: t.risk,
    judged: t.tags.map((g) => `${g.points > 0 ? "+" : ""}${g.points} ${g.label} (${g.gauge})`),
  }));
  const res = await openai().chat.completions.create({
    model: REPORT_MODEL,
    reasoning_effort: "minimal",
    response_format: { type: "json_schema", json_schema: { name: "report", strict: true, schema } },
    messages: [
      {
        role: "system",
        content:
          "You are a warm, sharp persuasion coach reviewing one round of a persuasion-training game. " +
          "The judged scores come from a rubric model; interpret them, don't repeat them. Quote the player's exact words. " +
          "Favor ethical persuasion: never praise threats, bribes, or lies. Plain words, one short sentence per note. If the player said little, give fewer points. Prefer different quotes in the two lists. " +
          "Also coach delivery: if `verbal_habits` lists filler words (um, uh, like, you know), hedges (I think, maybe, just, kind of) or apologies, " +
          "add an improvement that quotes a line containing them and says how to cut them. Also flag rambling lines that bury the ask.",
      },
      {
        role: "user",
        content: JSON.stringify({
          character: { name: c.brief.name, role: c.brief.role, personality: c.persona, hidden_concern: c.hiddenConcern },
          player_goal: c.brief.scenario.goal,
          outcome,
          verbal_habits: habits.map((h) => `${h.word} x${h.count} (${h.kind})`),
          turns: log,
        }),
      },
    ],
  });
  return { ...JSON.parse(res.choices[0].message.content ?? "{}"), habits };
}
