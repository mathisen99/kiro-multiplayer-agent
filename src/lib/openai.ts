import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): { client: OpenAI; model: string } {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_AGENT_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error("AI configuration unavailable");
  }

  client ??= new OpenAI({ apiKey });
  return { client, model };
}
