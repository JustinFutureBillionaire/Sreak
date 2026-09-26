import { noul } from "@typesafe-ai/sdk";
import { jev, openai, why } from "@/lib/clients";
import { DIALOGUE_MODEL } from "@/lib/dialogue";

export const dynamic = "force-dynamic";

// Open /api/health on a deployment to see whether keys are set and both services answer. Never returns key values.
export async function GET() {
  const check = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return "ok";
    } catch (err) {
      return `error: ${why(err)}`;
    }
  };
  const [judge, dialogue] = await Promise.all([
    check(() => jev().systemOne({ state: "hello", questions: { q: noul("Is this a greeting?") } })),
    check(() => openai().models.retrieve(DIALOGUE_MODEL)),
  ]);
  return Response.json({
    keys: { TYPESAFE_API_KEY: !!process.env.TYPESAFE_API_KEY, OPENAI_API_KEY: !!process.env.OPENAI_API_KEY },
    judge,
    dialogue,
  });
}
