# Sreak

Speak and Break: a persuasion-training game. Talk your way past a night guard or win over an investor; every line is judged live by Jev (TypeSafe) and the character answers with GPT-5 nano. Spec: [`docs/PRD.md`](docs/PRD.md).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in TYPESAFE_API_KEY and OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Voice input uses the browser's speech recognition: Chrome or Edge, on localhost or HTTPS.

## Deploy to Vercel

1. vercel.com/new → import this GitHub repo. Framework preset: Next.js (auto-detected), no other settings.
2. Environment Variables (Production + Preview): `TYPESAFE_API_KEY`, `OPENAI_API_KEY`.
3. Deploy. Every push to `main` redeploys.

The build does not need the keys; the API routes read them on the first request. If a turn fails with "Judge is unavailable", the Jev key is missing or wrong; if the character only says canned lines, the OpenAI key is missing or out of credits (check the function logs in Vercel).
