import { TypeSafeClient } from "@typesafe-ai/sdk";
import OpenAI from "openai";

// Created on first request, not at import, so `next build` works without API keys (e.g. a fresh Vercel project).
let _jev: TypeSafeClient | undefined;
let _openai: OpenAI | undefined;
export const jev = () => (_jev ??= new TypeSafeClient());
export const openai = () => (_openai ??= new OpenAI());
