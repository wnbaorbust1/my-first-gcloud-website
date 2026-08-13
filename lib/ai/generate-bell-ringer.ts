import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildBellRingerSystemPrompt } from "@/lib/ai/prompts";
import { generatedBellRingerSchema, type GeneratedBellRinger } from "@/lib/ai/schemas";

type CandidateTeks = { code: string; description: string };

export type GenerateBellRingerInput = {
  courseDisplayName: string;
  mode: "topic" | "spiral_review";
  /** The teacher's typed topic — required for "topic" mode, ignored for "spiral_review". */
  topic?: string;
  /** Candidate TEKS to choose from — the full course list in "topic" mode, recently-covered-only in "spiral_review" mode (see the bell-ringer generation route). */
  candidateTeks: CandidateTeks[];
};

export type GenerateBellRingerResult =
  | { ok: true; bellRinger: GeneratedBellRinger }
  | { ok: false; error: string };

function buildUserMessage(input: GenerateBellRingerInput): string {
  const teksBlock =
    input.candidateTeks.length > 0
      ? `\n\nCandidate TEKS (choose only from this list):\n${input.candidateTeks
          .map((t) => `- ${t.code}: ${t.description}`)
          .join("\n")}`
      : "\n\nNo candidate TEKS available — leave teks_codes empty.";

  if (input.mode === "spiral_review") {
    return `Course: ${input.courseDisplayName}

Mode: spiral review — pick one recently-covered standard from the
candidates below and write a review bell ringer for it.${teksBlock}

Generate the complete bell ringer now.`;
  }

  return `Course: ${input.courseDisplayName}

Topic for today's bell ringer: ${input.topic}${teksBlock}

Generate the complete bell ringer now.`;
}

/**
 * Generates one bell ringer (prompt + answer key), the same streaming +
 * structured-output pattern as generateAssignment() in
 * generate-assignment.ts. Unlike lesson/assignment/assessment generation,
 * this is called directly by teachers (see app/api/ai/generate-bell-
 * ringer/route.ts) — it's a spontaneous personal tool, not admin-curated
 * library content, so there's no publish/draft step here.
 */
export async function generateBellRinger(
  input: GenerateBellRingerInput,
): Promise<GenerateBellRingerResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(generatedBellRingerSchema),
      },
      system: buildBellRingerSystemPrompt(input.mode),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The AI declined to generate this bell ringer. Try rephrasing the topic.",
      };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response didn't match the expected format. Try again — this usually succeeds on retry.",
      };
    }

    return { ok: true, bellRinger: message.parsed_output };
  } catch (error) {
    console.error("generateBellRinger failed", error);
    return {
      ok: false,
      error: "Bell ringer generation failed unexpectedly. Try again in a moment.",
    };
  }
}
