import { TypeSafeClient } from "@typesafe-ai/sdk";
import OpenAI from "openai";

// Created on first request, not at import, so `next build` works without API keys (e.g. a fresh Vercel project).
let _jev: TypeSafeClient | undefined;
let _openai: OpenAI | undefined;
export const jev = () => (_jev ??= new TypeSafeClient());
export const openai = () => (_openai ??= new OpenAI());

// A short, player-facing reason for an API failure. Never includes key values.
export function why(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (/api key/i.test(e?.message ?? "")) return "API key is not set on the server";
  if (e?.status === 401 || e?.status === 403) return "API key was rejected";
  if (e?.status === 429) return "rate limited or out of credits";
  if (e?.status && e.status >= 500) return `service error ${e.status}`;
  return e?.message?.slice(0, 120) ?? "unknown error";
}

// One retry for transient failures (network blips, 429, 5xx). Auth problems fail fast.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const s = (err as { status?: number }).status;
    if (s === 401 || s === 403 || /api key/i.test((err as Error).message ?? "")) throw err;
    await new Promise((r) => setTimeout(r, 300));
    return fn();
  }
}
