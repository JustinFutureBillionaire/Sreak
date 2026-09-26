import { getCharacter } from "@/lib/characters";
import { jev } from "@/lib/clients";

// One short Jev check; the cap only guards against slow cold starts.
export const maxDuration = 30;

// Voice endpointing: after a pause, ask Jev whether the player has finished their turn.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const character = getCharacter(body?.characterId);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 800) : "";
  const lastLine = typeof body?.lastLine === "string" ? body.lastLine.slice(0, 500) : "";
  if (!character || !text) return Response.json({ error: "Need characterId and text." }, { status: 400 });

  try {
    const { answers } = await jev().systemOne({
      state: {
        situation: `A player is speaking out loud to ${character.brief.name} (${character.brief.role}) to persuade them. Speech is transcribed live and may lack punctuation.`,
        character_last_line: lastLine || character.brief.opening,
        player_speech_so_far: text,
      },
      questions: {
        done: {
          type: "noul",
          instructions:
            "The player just paused. Has the player finished making their point in `player_speech_so_far` and is now waiting for a response?",
          criteria: {
            true: "A complete thought: a request, question, offer, or point that stands on its own and invites a reply.",
            false: "Clearly mid-thought: trails off, ends on a connector ('and', 'because', 'so', 'but'), an unfinished clause, or filler ('um', 'like').",
          },
        },
      },
    });
    return Response.json({ done: answers.done.noul >= 0.5, p: answers.done.noul });
  } catch (err) {
    console.error("Endpoint check failed", err);
    // If Jev is down, treat the pause as the end so the game keeps moving.
    return Response.json({ done: true, p: null });
  }
}
