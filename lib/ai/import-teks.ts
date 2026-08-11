import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildTeksImportSystemPrompt } from "@/lib/ai/prompts";
import { teksImportResultSchema, type TeksImportRow } from "@/lib/ai/schemas";

export type ParseTeksImportInput = {
  subject: string;
  rawText: string;
};

export type ParseTeksImportResult =
  | { ok: true; rows: TeksImportRow[] }
  | { ok: false; error: string };

/**
 * Parses raw, messily-formatted TEKS standards text (pasted straight from
 * a TEA document or similar) into structured {code, description} rows for
 * an admin to review before committing to the teks table. Never writes to
 * the DB itself — see lib/admin/teks-actions.ts for the commit step.
 */
export async function parseTeksImport(
  input: ParseTeksImportInput,
): Promise<ParseTeksImportResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(teksImportResultSchema),
      },
      system: buildTeksImportSystemPrompt(input.subject),
      messages: [{ role: "user", content: input.rawText }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined to parse this text." };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response wasn't in the expected format. Try again.",
      };
    }

    if (message.parsed_output.rows.length === 0) {
      return {
        ok: false,
        error: "No standards were recognized in that text. Check the pasted content and try again.",
      };
    }

    return { ok: true, rows: message.parsed_output.rows };
  } catch (error) {
    console.error("parseTeksImport failed", error);
    return { ok: false, error: "Parsing failed unexpectedly. Try again." };
  }
}
