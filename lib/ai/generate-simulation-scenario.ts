import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildSimulationScenarioSystemPrompt } from "@/lib/ai/prompts";
import { generatedSimulationScenarioSchema, type GeneratedSimulationScenario } from "@/lib/ai/schemas";

export type GenerateSimulationScenarioInput = {
  courseDisplayName: string;
  topic: string;
  notes?: string;
  candidateTeks: { code: string; description: string }[];
};

export type GenerateSimulationScenarioResult =
  | { ok: true; scenario: GeneratedSimulationScenario }
  | { ok: false; error: string };

function buildUserMessage(input: GenerateSimulationScenarioInput): string {
  const teksBlock =
    input.candidateTeks.length > 0
      ? `\n\nCandidate TEKS (choose only from this list):\n${input.candidateTeks
          .map((t) => `- ${t.code}: ${t.description}`)
          .join("\n")}`
      : "\n\nNo candidate TEKS available — leave teks_codes empty.";

  return `Course: ${input.courseDisplayName}

Scenario topic: ${input.topic}
${input.notes ? `\nAdmin's notes: ${input.notes}` : ""}${teksBlock}

Generate the complete scenario now.`;
}

/**
 * Generates one financial-life-simulation scenario template — same
 * streaming + structured-output pattern as every other generator in this
 * directory. Unlike bell ringers, this IS admin-only content (a shared
 * template teachers assign to classes, not something a teacher generates
 * ad hoc for themselves) — see app/api/ai/generate-simulation-scenario/route.ts.
 */
export async function generateSimulationScenario(
  input: GenerateSimulationScenarioInput,
): Promise<GenerateSimulationScenarioResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(generatedSimulationScenarioSchema),
      },
      system: buildSimulationScenarioSystemPrompt(),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The AI declined to generate this scenario. Try rephrasing the topic or notes.",
      };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response didn't match the expected format. Try again — this usually succeeds on retry.",
      };
    }

    return { ok: true, scenario: message.parsed_output };
  } catch (error) {
    console.error("generateSimulationScenario failed", error);
    return {
      ok: false,
      error: "Scenario generation failed unexpectedly. Try again in a moment.",
    };
  }
}
