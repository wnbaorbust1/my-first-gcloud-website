import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildSuggestTeksSystemPrompt } from "@/lib/ai/prompts";
import { teksSuggestionsSchema, type TeksMatch } from "@/lib/ai/schemas";

export type SuggestTeksInput = {
  contentTitle: string;
  /** Flattened, readable text of the lesson/assignment's content — what a
   * teacher would actually read, not raw DB field dumps. */
  contentBody: string;
  candidateTeks: { code: string; description: string }[];
};

export type SuggestTeksResult =
  | { ok: true; matches: TeksMatch[] }
  | { ok: false; error: string };

function buildUserMessage(input: SuggestTeksInput): string {
  const teksList = input.candidateTeks.map((t) => `- ${t.code}: ${t.description}`).join("\n");

  return `Content title: ${input.contentTitle}

Content:
${input.contentBody}

Candidate TEKS codes (choose only from this list):
${teksList}

Suggest which of these codes this content addresses.`;
}

/**
 * Semantic TEKS matching for one piece of content (a lesson or an
 * assignment). Suggestion-only by design — the caller always renders
 * these as an approve/reject list; nothing here ever writes to the DB.
 */
export async function suggestTeksForContent(
  input: SuggestTeksInput,
): Promise<SuggestTeksResult> {
  if (input.candidateTeks.length === 0) {
    return { ok: true, matches: [] };
  }

  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(teksSuggestionsSchema),
      },
      system: buildSuggestTeksSystemPrompt(),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined to suggest TEKS codes for this content." };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response wasn't in the expected format. Try again.",
      };
    }

    // Defensive: only keep matches whose code is actually in the
    // candidate set — don't trust the model not to invent one.
    const validCodes = new Set(input.candidateTeks.map((t) => t.code));
    const matches = message.parsed_output.matches.filter((m) => validCodes.has(m.code));

    return { ok: true, matches };
  } catch (error) {
    console.error("suggestTeksForContent failed", error);
    return { ok: false, error: "TEKS suggestion failed unexpectedly. Try again." };
  }
}
