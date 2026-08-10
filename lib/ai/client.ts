import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Server-only Anthropic client. Never import this from a Client Component —
 * the `server-only` guard turns that into a build error rather than a
 * leaked API key.
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "getAnthropicClient: ANTHROPIC_API_KEY is not set. Add it to .env.local.",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Every AI lesson-generation call in this app uses this model — see
 * lib/ai/README (or the skill this was built against): default to Opus
 * unless a task explicitly calls for something else. Lesson generation,
 * targeted field rewrites, and gap suggestions are all "would benefit from
 * strong reasoning" tasks, so there's no cheaper tier substituted here.
 */
export const AI_MODEL = "claude-opus-5";
