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
  scenario: {
    time: string;
    place: string;
    you: string;
    goal: string;
    // Facts the player can truthfully use. Anything else is made up (and R3 catches it).
    youHave: string[];
  };
  opening: string;
};

export type Character = {
  id: string;
  brief: Brief;
  persona: string;
  hiddenConcern: string;
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
      scenario: {
        time: "Thursday, 11:40 PM. Raining.",
        place: "Lobby of Harbor Point Tower, a 20-floor office building downtown. The turnstiles lock at 10 PM.",
        you: "A junior product designer at Lumen Labs, a 30-person startup on the 14th floor.",
        goal: "Get Dale to let you up to the 14th floor. Your laptop is on your desk, and your investor demo is at 9 AM tomorrow. The final slides only exist on that laptop.",
        youHave: [
          "Your driver's license (your name is on it)",
          "Your office badge, which stopped working at 10 PM (after-hours access is only for managers)",
          "Your manager, Priya Shah, isn't answering her phone",
          "A Slack message on your phone from Priya this afternoon: \"Don't forget the laptop, demo's at 9!\"",
          "You know the 14th-floor layout: glass door, a neon \"LUMEN\" sign, your desk by the window",
        ],
      },
      opening: "*looks up from a crossword* Building's closed, pal. Turnstiles locked at ten. Come back in the morning.",
    },
    persona:
      "Dale, 58, has worked nights at this building for 11 years. He is tired, a little lonely, and warms up to people who are friendly and treat him like a person. He dislikes people who act important or throw titles around. He speaks in short, dry sentences.",
    hiddenConcern:
      "Last month Dale let a 'delivery guy' up without a log entry and a monitor was stolen. He got a written warning. One more mistake and he is fired. He needs anything he does tonight to be defensible to his supervisor.",
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
      scenario: {
        time: "Tuesday, 10:00 AM. You have 20 minutes.",
        place: "A quiet corner table at Ritual Coffee in San Francisco. A mutual friend set up the intro.",
        you: "Co-founder and CEO of ShelfLife, an app that lets independent grocery stores sell food close to its expiry date, at a discount, to shoppers nearby.",
        goal: "Get Dana to commit to your pre-seed round. You're raising $750K on a SAFE at a $6M cap, and you'd like $50K from her.",
        youHave: [
          "Problem: small grocers throw out 2–4% of revenue in expired food; they can't afford the waste software big chains use",
          "Traction: 14 stores in Oakland, 2,100 monthly active shoppers, $38K in sales through the app over the last 3 months",
          "Business model: 15% fee on every sale; month-2 shopper retention is 41%",
          "Team: you ran operations at Instacart for 4 years; your co-founder was a payments engineer at Stripe",
          "Market: about 20,000 independent grocery stores in the US (industry association estimate)",
          "Weak spot: 2 of your first 16 stores quit after the pilot",
        ],
      },
      opening: "*stirs her latte* So Maya says you're working on something with grocery stores. I've got twenty minutes. Tell me what you're building.",
    },
    persona:
      "Dana, 44, sold her HR-software startup six years ago and now writes $25K–$100K angel checks. She is warm, curious, and cares most about the problem and the founders. She asks simple, human questions and dislikes jargon.",
    hiddenConcern:
      "Two founders she backed quit within 18 months when things got hard. She is quietly testing whether this founder will stick with it, and why they personally care about this problem.",
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
