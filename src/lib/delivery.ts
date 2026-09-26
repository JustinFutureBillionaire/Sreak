// Counts verbal habits in the player's lines. Deterministic, so the numbers on the result screen are exact;
// the coach model gets them too and quotes the worst lines.
// ponytail: phrase lists, no context. "like" only counts as filler when a comma follows it; upgrade to a Jev noul per line if needed.

export type Habit = { kind: "filler" | "hedge" | "apology"; word: string; count: number };

const patterns: { kind: Habit["kind"]; word: string; re: RegExp }[] = [
  { kind: "filler", word: "um", re: /\b(u+m+|h?m+)\b/gi },
  { kind: "filler", word: "uh", re: /\b(u+h+|e+r+|a+h+)\b/gi },
  { kind: "filler", word: "like", re: /\blike\s*,/gi },
  { kind: "filler", word: "you know", re: /\byou know\b/gi },
  { kind: "filler", word: "I mean", re: /\bi mean\b/gi },
  { kind: "filler", word: "basically", re: /\bbasically\b/gi },
  { kind: "filler", word: "literally", re: /\bliterally\b/gi },
  { kind: "filler", word: "actually", re: /\bactually\b/gi },
  { kind: "filler", word: "so yeah", re: /\bso,? yeah\b/gi },
  { kind: "hedge", word: "I think", re: /\bi think\b/gi },
  { kind: "hedge", word: "maybe", re: /\bmaybe\b/gi },
  { kind: "hedge", word: "kind of / sort of", re: /\b(kind|sort) of\b/gi },
  { kind: "hedge", word: "I guess", re: /\bi guess\b/gi },
  { kind: "hedge", word: "just", re: /\bjust\b/gi },
  { kind: "hedge", word: "probably", re: /\bprobably\b/gi },
  { kind: "apology", word: "sorry", re: /\bsorry\b/gi },
];

export function countHabits(lines: string[]): Habit[] {
  const text = lines.join("\n");
  return patterns
    .map(({ kind, word, re }) => ({ kind, word, count: text.match(re)?.length ?? 0 }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Self-check: node --experimental-strip-types src/lib/delivery.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const got = Object.fromEntries(countHabits(["Um, so like, I just think maybe we could, uh, you know, go up?", "I like this plan, sorry."]).map((h) => [h.word, h.count]));
  const want = { um: 1, uh: 1, like: 1, "you know": 1, just: 1, maybe: 1, sorry: 1 };
  for (const [k, v] of Object.entries(want)) if (got[k] !== v) throw new Error(`${k}: got ${got[k]}, want ${v}`);
  if (got["I think"]) throw new Error("'just think' is not 'I think'");
  console.log("delivery ok", got);
}
