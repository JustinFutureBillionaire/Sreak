@AGENTS.md

# Srake

Persuasion-training web game. Spec: `docs/PRD.md` (source of truth).

- Stack: Next.js (App Router, `src/`), TypeScript, Tailwind v4, Framer Motion, `openai`, `@typesafe-ai/sdk` (Jev)
- System 1 (Jev) = judging, System 2 (OpenAI GPT) = dialogue + feedback report
- No login, no DB: `/api/turn` is stateless, the client sends its history each turn
- Deploy: Vercel (keys go in Vercel env vars)
- Keys: `.env.local` (see `.env.example`), server-side only
- Stage content + scenarios: `src/lib/characters.ts`; rubric + scoring: `src/lib/engine.ts`
