import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildGenerateAssignmentSystemPrompt } from "@/lib/ai/prompts";
import { generatedAssignmentSchema, type GeneratedAssignment } from "@/lib/ai/schemas";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/curriculum/constants";
import type { AssignmentType } from "@/types/supabase";

export type GenerateAssignmentInput = {
  courseDisplayName: string;
  unitTitle: string;
  unitTeksFocusSummary: string | null;
  assignmentType: AssignmentType;
  topic: string;
  notes?: string;
};

export type GenerateAssignmentResult =
  | { ok: true; assignment: GeneratedAssignment }
  | { ok: false; error: string };

function buildUserMessage(input: GenerateAssignmentInput): string {
  return `Course: ${input.courseDisplayName}
Unit: ${input.unitTitle}${input.unitTeksFocusSummary ? `\nUnit TEKS focus: ${input.unitTeksFocusSummary}` : ""}
Assignment type: ${ASSIGNMENT_TYPE_LABELS[input.assignmentType]}

Topic for this assignment: ${input.topic}
${input.notes ? `\nTeacher's notes: ${input.notes}` : ""}

Generate the complete assignment now.`;
}

/**
 * Generates one full assignment (instructions, teacher directions, rubric,
 * answer key) from a topic + type, the same streaming + structured-output
 * pattern as generateLesson() in generate-lesson.ts.
 */
export async function generateAssignment(
  input: GenerateAssignmentInput,
): Promise<GenerateAssignmentResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(generatedAssignmentSchema),
      },
      system: buildGenerateAssignmentSystemPrompt(input.assignmentType),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The AI declined to generate this assignment. Try rephrasing the topic or notes.",
      };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error:
          "The AI's response didn't match the expected assignment format. Try again — this usually succeeds on retry.",
      };
    }

    return { ok: true, assignment: message.parsed_output };
  } catch (error) {
    console.error("generateAssignment failed", error);
    return {
      ok: false,
      error: "Assignment generation failed unexpectedly. Try again in a moment.",
    };
  }
}
