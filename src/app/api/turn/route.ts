import { TypeSafeClient } from "@typesafe-ai/sdk";
import { getCharacter } from "@/lib/characters";
import { buildState, questionsFor, score, type Answers, type PastTurn } from "@/lib/engine";

const jev = new TypeSafeClient();

// Stateless: the client sends its own history each turn, so this works on Vercel without a store.
// ponytail: client-held history is trusted; a cheater only cheats themselves. Move to a session store with login.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const character = getCharacter(body?.characterId);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : undefined);
  const history: PastTurn[] = (Array.isArray(body?.history) ? body.history.slice(-20) : []).map(
    (t: Record<string, unknown>) => ({ player: str(t?.player) ?? "", npc: str(t?.npc), tag: str(t?.tag) }),
  );
  if (!character || !text || text.length > 500) {
    return Response.json({ error: "Need a valid characterId and 1–500 characters of text." }, { status: 400 });
  }

  const started = Date.now();
  const { answers } = await jev.systemOne({
    state: buildState(character, history, text),
    questions: questionsFor(character.brief.mode),
  });
  const result = score(character, answers as unknown as Answers, history);

  return Response.json({ ...result, answers, ms: Date.now() - started });
}
