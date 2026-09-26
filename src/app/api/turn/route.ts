import { getCharacter } from "@/lib/characters";
import { jev, why, withRetry } from "@/lib/clients";
import { fallbackReply, streamReply } from "@/lib/dialogue";
import { buildState, questionsFor, score, type Answers, type PastTurn } from "@/lib/engine";

// Jev + streamed dialogue; well under this, but leave headroom on slow cold starts.
export const maxDuration = 30;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

// Stateless: the client sends its own history and gauges each turn, so this works on Vercel without a store.
// ponytail: client-held state is trusted; a cheater only cheats themselves. Move to a session store with login.
// Response is NDJSON: one {"type":"judge"} line as soon as Jev answers, then {"type":"reply","delta"} lines, then {"type":"done"}.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const character = getCharacter(body?.characterId);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 800) : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? clamp(v) : 0);
  const history: PastTurn[] = (Array.isArray(body?.history) ? body.history.slice(-20) : []).map(
    (t: Record<string, unknown>) => ({ player: str(t?.player) ?? "", npc: str(t?.npc), tag: str(t?.tag) }),
  );
  if (!character || !text || text.length > 800) {
    return Response.json({ error: "Need a valid characterId and 1–800 characters of text." }, { status: 400 });
  }

  const started = Date.now();
  let judged;
  try {
    const { answers } = await withRetry(() =>
      jev().systemOne({
        state: buildState(character, history, text),
        questions: questionsFor(character.brief.mode),
      }),
    );
    judged = { ...score(character, answers as unknown as Answers, history), ms: Date.now() - started };
  } catch (err) {
    console.error("Jev failed", err);
    return Response.json({ error: `Judge is unavailable (${why(err)}). Your line was kept, send it again.` }, { status: 502 });
  }

  const mood = {
    progress: clamp(num(body?.progress) + judged.progress),
    risk: clamp(num(body?.risk) + judged.risk),
    event: judged.event,
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      // The browser can hang up mid-stream (navigation, retry); stop writing instead of throwing.
      let open = true;
      const send = (o: object) => {
        if (!open) return;
        try {
          ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {
          open = false;
        }
      };
      send({ type: "judge", ...judged });
      if (judged.voided) {
        send({ type: "reply", delta: "*frowns* Let's keep this about why you're here." });
      } else {
        try {
          for await (const chunk of await streamReply(character, history, text, mood)) {
            if (!open) break;
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) send({ type: "reply", delta });
          }
        } catch (err) {
          console.error("Dialogue failed, using fallback", err);
          send({ type: "reply", delta: fallbackReply(character, mood) });
        }
      }
      send({ type: "done" });
      if (open) ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
