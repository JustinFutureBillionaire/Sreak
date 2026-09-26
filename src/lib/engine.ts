import type { ChoiceQuestion, NoulQuestion } from "@typesafe-ai/sdk";
import type { Character, Mode } from "./characters";

type Q = NoulQuestion | ChoiceQuestion;
const yes = (instructions: string, no?: string): NoulQuestion =>
  no ? { type: "noul", instructions, criteria: { false: no } } : { type: "noul", instructions };
const pick = (instructions: string, criteria: Record<string, string | null>): ChoiceQuestion => ({
  type: "choice",
  instructions,
  criteria,
});

// Every question judges `utterance` against the rest of the state (see buildState).
const core: Record<Mode, Record<string, Q>> = {
  gate: {
    G1: yes(
      "Does `utterance` give an actual reason (a 'because') why the guard should let the player in?",
      "No reason, or the 'reason' only restates the request, e.g. 'because I need to get in'.",
    ),
    G2: pick("Which influence principle does `utterance` mainly rely on to persuade the guard?", {
      reciprocity: "Offers or recalls a favor so the guard feels he should return it",
      consistency: "Ties the request to something the guard already said, agreed to, or values",
      social_proof: "Points to what other people in the same position do or have done",
      authority: "Leans on titles, rank, bosses, rules, or official status",
      liking: "Builds rapport: warmth, compliments, shared interests, treating him as a person",
      scarcity: "Stresses urgency, a deadline, or something that will be lost",
      unity: "Frames the player and guard as the same group ('we', both working late, both employees)",
      none: "No clear influence principle",
    }),
    G3: yes("Does `utterance` include a concrete detail the guard could actually check (a name, a floor, an ID, a message)?"),
    G4: yes("Does `utterance` explicitly acknowledge that it is the guard's decision and he is free to say no?"),
    G5: pick("Compared with the player's previous request in `recent_turns`, how big is the request in `utterance`?", {
      smaller: "Asks for less than before (e.g. just check a name, instead of letting them up)",
      same: "Same size request, or no request",
      bigger: "Asks for more than before",
      first: "There is no previous request in `recent_turns`",
    }),
    G6: yes("Does `utterance` ask the guard a small, easy question he would naturally answer 'yes' to?"),
    G7: yes("Does `utterance` offer something that reduces the guard's own responsibility or risk (logging it, showing ID, him escorting, a way to verify)?"),
  },
  pitch: {
    I1: yes("Does `utterance` make a clear claim about the business?"),
    I2: pick("What kind of evidence does `utterance` use?", {
      quantitative: "Numbers or metrics",
      customer: "Concrete customer behavior, quotes, or examples",
      citation: "A sourced external fact or study",
      anecdote: "A personal story or single anecdote",
      none: "No evidence",
    }),
    I3: yes("Does `utterance` explain why its evidence supports its claim, rather than just listing facts?"),
    I4: yes(
      "Does `utterance` directly answer the question the investor asked in `last_character_line`?",
      "Dodges, changes the subject, or the investor asked no question.",
    ),
    I5: yes("Does `utterance` openly admit a risk, weakness, or limitation of the business?"),
    I6: yes("Does `utterance` address a likely investor objection before the investor raises it?"),
    I7: pick("Which part of the pitch does `utterance` mainly cover?", {
      problem: null,
      solution: null,
      market: null,
      traction: null,
      business_model: null,
      competition: null,
      team: "The founders, their background, or why they are the right people",
      ask: "The round, amount, or terms",
      none: "None of these",
    }),
    I8: yes("When `utterance` uses numbers, does it say where they come from or how they were calculated?", "No numbers, or numbers with no source."),
    I9: yes("Does `utterance` translate the point into investor terms: returns, risk, or exit?"),
  },
};

const common: Record<string, Q> = {
  S1: yes("Does `utterance` have one clear core request or claim?"),
  S2: yes("Is `utterance` concise, without filler or rambling?"),
  S3: yes("Does `utterance` respond specifically to what the character said in `last_character_line`?"),
  S5: yes("Does `utterance` use concrete numbers, names, or scenes instead of abstractions?"),
  S7: yes("Does `utterance` acknowledge the character's position or feelings?"),
  C6: pick("How does `utterance` relate to the character's `hidden_concern` (which the player cannot see)?", {
    probing: "Asks a question that could uncover the hidden concern",
    resolves: "Directly addresses or relieves the hidden concern",
    unrelated: "Neither",
  }),
  R1: yes("Is `utterance` a threat or intimidation?"),
  R2: yes("Does `utterance` offer a bribe, money, or a gift in exchange for what the player wants?"),
  R3: yes(
    "Does `utterance` claim an identity, authority, or fact the player does not actually have according to `player.facts`?",
    "Everything claimed is consistent with `player.facts`, or nothing is claimed.",
  ),
  R4: yes("Does `utterance` repeat an argument the player already made in `recent_turns`?", "New argument, or there are no earlier turns."),
  R5: yes("Is `utterance` off-topic for the scene?"),
  R6: yes("Is `utterance` rude or a personal attack on the character?"),
  R7: yes("Is `utterance` harmful content unrelated to the game (hate, self-harm, sexual content, real-world violence)?"),
};

export const questionsFor = (mode: Mode) => ({ ...core[mode], ...common });

export type PastTurn = { player: string; npc?: string; tag?: string };

export function buildState(c: Character, history: PastTurn[], utterance: string) {
  const recent = history.slice(-2);
  return {
    character: { name: c.brief.name, role: c.brief.role, personality: c.persona },
    hidden_concern: c.hiddenConcern,
    player: { who: c.brief.scenario.you, goal: c.brief.scenario.goal, facts: c.brief.scenario.youHave },
    scene: `${c.brief.scenario.time} ${c.brief.scenario.place}`,
    recent_turns: recent.map((t) => ({ player: t.player, character: t.npc ?? "" })),
    last_character_line: recent.at(-1)?.npc ?? c.brief.opening,
    utterance,
  };
}

// Answers as the API returns them, narrowed to what scoring needs.
export type Answers = Record<string, { noul: number } | { choice: string; probabilities: Record<string, number> }>;
export type Tag = { code: string; label: string; points: number; gauge: "progress" | "risk" };

const labels: Record<string, string> = {
  G1: "Gave a reason", G3: "Verifiable detail", G4: "Your choice", G5: "Request size", G6: "Easy yes", G7: "Lightened his load",
  I1: "Clear claim", I2: "Evidence", I3: "Evidence linked", I4: "Answered the question", I5: "Owned a risk",
  I6: "Pre-empted objection", I7: "Covered", I8: "Sourced numbers", I9: "Investor language",
  S1: "One clear ask", S2: "Concise", S3: "Built on their line", S5: "Concrete", S7: "Acknowledged them",
  C6: "Hidden concern", R1: "Threat", R2: "Bribe", R3: "Unverifiable claim", R4: "Repetition", R5: "Off-topic", R6: "Rude",
};
const title = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const principleCode: Record<Mode, string> = { gate: "G2", pitch: "I7" };

// What the line was, for one-shot effects (flash, shake, yawn) and the NPC's reaction.
export type GameEvent = "critical" | "foul" | "repeat" | "none";
function eventOf(tags: Tag[]): GameEvent {
  const pts = (code: string) => tags.find((g) => g.code === code)?.points ?? 0;
  if (pts("R1") >= 10 || pts("R2") >= 10 || pts("R6") >= 10) return "foul";
  if (pts("C6") >= 8) return "critical";
  if (pts("R4") <= -4) return "repeat";
  return "none";
}

export function score(c: Character, answers: Answers, history: PastTurn[]) {
  if ("noul" in answers.R7 && answers.R7.noul > 0.5) {
    return { progress: 0, risk: 0, tags: [] as Tag[], tag: undefined, voided: true, event: "foul" as GameEvent };
  }

  const tags: Tag[] = [];
  const add = (table: Character["weights"], gauge: Tag["gauge"]) => {
    let sum = 0;
    for (const [code, w] of Object.entries(table)) {
      const a = answers[code];
      if (!a) continue;
      if ("noul" in a && typeof w === "number") {
        const pts = w * a.noul;
        sum += pts;
        tags.push({ code, label: labels[code] ?? code, points: pts, gauge });
      } else if ("choice" in a && typeof w === "object") {
        const pts = Object.entries(w).reduce((s, [opt, ow]) => s + ow * (a.probabilities[opt] ?? 0), 0);
        sum += pts;
        tags.push({ code, label: labels[code] ? `${labels[code]}: ${title(a.choice)}` : title(a.choice), points: pts, gauge });
      }
    }
    return sum;
  };

  let progress = add(c.weights, "progress");
  const risk = add(c.riskWeights, "risk");

  // Repetition decay: the k-th use of the same principle/pitch element earns 0.6^(k-1).
  const p = answers[principleCode[c.brief.mode]];
  const tag = p && "choice" in p && p.choice !== "none" && (p.probabilities[p.choice] ?? 0) >= 0.5 ? p.choice : undefined;
  if (tag && progress > 0) {
    const k = history.filter((t) => t.tag === tag).length + 1;
    progress *= 0.6 ** (k - 1);
  }

  const shown = tags.filter((t) => Math.abs(t.points) >= 3).map((t) => ({ ...t, points: Math.round(t.points) }));
  return { progress: Math.round(progress), risk: Math.round(risk), tags: shown, tag, voided: false, event: eventOf(shown) };
}
