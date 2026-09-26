// Stage content. Everything under `brief` is shown to the player;
// persona, hiddenConcern and weights stay on the server.

export type Mode = "gate" | "pitch";

export type Brief = {
  mode: Mode;
  modeTitle: string;
  stage: number;
  name: string;
  role: string;
  progressLabel: string;
  riskLabel: string;
  turnLimit: number;
  turnSeconds: number;
  scenario: {
    goal: string; // what winning looks like
    purpose: string; // why you're doing it
    // Facts the player can use.
    given: string[];
  };
  opening: string;
};

export type Character = {
  id: string;
  brief: Brief;
  persona: string;
  hiddenConcern: string;
  // Canned lines if OpenAI is unavailable, so the demo never stalls.
  fallback: { warm: string; cold: string; foul: string; win: string; lose: string };
  // Progress points per unit of Jev probability. Noul: code → weight. Choice: code → option → weight.
  weights: Record<string, number | Record<string, number>>;
  // Risk points per unit of Jev probability. Same shape as weights.
  riskWeights: Record<string, number | Record<string, number>>;
};

// Shared across modes: L2 style + L4 fouls + hidden concern.
const commonWeights = {
  S1: 2, S2: 2, S3: 3, S5: 3, S7: 3,
  C6: { probing: 5, resolves: 12, unrelated: 0 },
  // Fouls also cost progress, so a bribe never pays.
  R1: -15, R2: -15, R3: -6, R4: -8, R5: -5, R6: -8,
};
const commonRisk = { R1: 45, R2: 35, R3: 20, R6: 25 };

export const characters: Character[] = [
  {
    id: "gate-1",
    brief: {
      mode: "gate",
      modeTitle: "The Gate",
      stage: 1,
      name: "Dale",
      role: "Tired night-shift guard",
      progressLabel: "Door open",
      riskLabel: "Suspicion",
      turnLimit: 8,
      turnSeconds: 30,
      scenario: {
        goal: "Convince Dale, the night guard, to let you into the building so you can go upstairs and grab your laptop.",
        purpose: "Your laptop has the slides for a big presentation tomorrow morning. Without it, the presentation falls apart.",
        given: [
          "It's late at night and the building is locked",
          "You work on the 14th floor",
          "You have your ID with you",
          "Your work badge doesn't open the doors at night",
        ],
      },
      opening: "*looks up from a crossword* Building's closed, pal. Come back in the morning.",
    },
    persona:
      "Dale, 58, has worked nights at this building for 11 years. He is tired, a little lonely, and warms up to people who are friendly and treat him like a person. He dislikes people who act important or throw titles around. He speaks in short, dry sentences.",
    hiddenConcern:
      "Last month Dale let a 'delivery guy' up without a log entry and a monitor was stolen. He got a written warning. One more mistake and he is fired. He needs anything he does tonight to be defensible to his supervisor.",
    fallback: {
      warm: "*rubs his eyes* ...Alright, I'm listening. Keep talking.",
      cold: "Uh-huh. I've heard that one before, pal.",
      foul: "*stands up* Whoa. That's not how this works. Try that again and I'm calling it in.",
      win: "*sighs, grabs the keys* Fine. I'm logging it, and I'm walking up with you. Five minutes.",
      lose: "We're done here. Door stays shut. Come back at seven.",
    },
    weights: {
      ...commonWeights,
      G1: 5, G3: 4, G4: 4, G6: 3, G7: 6,
      G2: { reciprocity: 5, consistency: 5, social_proof: 3, authority: -6, liking: 7, scarcity: 2, unity: 6, none: 0 },
      G5: { smaller: 4, same: 0, bigger: -4, first: 0 },
    },
    riskWeights: {
      ...commonRisk,
      G2: { authority: 8 },
      G5: { bigger: 6 },
    },
  },
  {
    id: "pitch-1",
    brief: {
      mode: "pitch",
      modeTitle: "The Pitch",
      stage: 1,
      name: "Dana Okafor",
      role: "Friendly angel investor",
      progressLabel: "Conviction",
      riskLabel: "Skepticism",
      turnLimit: 10,
      turnSeconds: 45,
      scenario: {
        goal: "Convince Dana, an angel investor, to put $50K into your startup before your 20-minute coffee is up.",
        purpose: "You need money to bring ShelfLife to more stores, and Dana's check would help you close your round.",
        given: [
          "You founded ShelfLife, an app where grocery stores sell food close to its expiry date at a discount",
          "14 stores already use it",
          "$38K in sales in the last 3 months",
          "Your co-founder used to be an engineer at Stripe",
        ],
      },
      opening: "*stirs her latte* So Maya says you're working on something with grocery stores. I've got twenty minutes. Tell me what you're building.",
    },
    persona:
      "Dana, 44, sold her HR-software startup six years ago and now writes $25K–$100K angel checks. She is warm, curious, and cares most about the problem and the founders. She asks simple, human questions and dislikes jargon.",
    hiddenConcern:
      "Two founders she backed quit within 18 months when things got hard. She is quietly testing whether this founder will stick with it, and why they personally care about this problem.",
    fallback: {
      warm: "*leans in* Okay, that's interesting. Tell me more.",
      cold: "Hm. I'm not sure I'm seeing it yet.",
      foul: "*sets down her cup* I'm going to stop you there. That's not how I work.",
      win: "*smiles* Alright. Send me the SAFE. I'm in for fifty.",
      lose: "I appreciate your time, but it's a pass for me. Good luck.",
    },
    weights: {
      ...commonWeights,
      I1: 4, I3: 5, I4: 6, I5: 5, I6: 4, I8: 4, I9: 3,
      I2: { quantitative: 6, customer: 7, citation: 4, anecdote: 2, none: 0 },
      I7: { problem: 4, solution: 3, market: 2, traction: 5, business_model: 3, competition: 2, team: 5, ask: 2, none: 0 },
    },
    riskWeights: {
      ...commonRisk,
      I2: { none: 6 },
      I4: -5,
    },
  },
];

export const getCharacter = (id: string) => characters.find((c) => c.id === id);
