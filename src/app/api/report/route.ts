import { getCharacter } from "@/lib/characters";
import { generateReport } from "@/lib/report";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const character = getCharacter(body?.characterId);
  const turns = Array.isArray(body?.turns) ? body.turns.slice(0, 20) : null;
  if (!character || !turns || !["win", "lose"].includes(body?.outcome)) {
    return Response.json({ error: "Need characterId, outcome and turns." }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : "");
  const clean = turns.map((t: Record<string, unknown>) => ({
    player: str(t?.player),
    npc: str(t?.npc),
    progress: Number(t?.progress) || 0,
    risk: Number(t?.risk) || 0,
    tags: (Array.isArray(t?.tags) ? t.tags.slice(0, 30) : []).map((g: Record<string, unknown>) => ({
      label: str(g?.label),
      points: Number(g?.points) || 0,
      gauge: str(g?.gauge),
    })),
  }));
  try {
    return Response.json(await generateReport(character, body.outcome, clean));
  } catch (err) {
    console.error("Report failed", err);
    return Response.json({ error: "Report unavailable." }, { status: 502 });
  }
}
