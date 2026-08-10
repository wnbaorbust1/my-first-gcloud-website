import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildGenerateLessonSystemPrompt } from "@/lib/ai/prompts";
import { generatedLessonSchema, type GeneratedLesson } from "@/lib/ai/schemas";
import { DAY_LABELS } from "@/lib/curriculum/constants";

export type GenerateLessonInput = {
  courseDisplayName: string;
  unitTitle: string;
  unitTeksFocusSummary: string | null;
  weekTitle: string;
  weekNumber: number;
  dayNumber: number;
  topic: string;
  notes?: string;
  /** Pre-filtered to the course so Claude isn't choosing from all 8 subjects' worth of codes. */
  candidateTeks: { code: string; description: string }[];
};

export type GenerateLessonResult =
  | { ok: true; lesson: GeneratedLesson }
  | { ok: false; error: string };

function buildUserMessage(input: GenerateLessonInput): string {
  const dayLabel = DAY_LABELS[input.dayNumber] ?? `Day ${input.dayNumber}`;
  const teksList =
    input.candidateTeks.length > 0
      ? input.candidateTeks.map((t) => `- ${t.code}: ${t.description}`).join("\n")
      : "(no candidate TEKS codes available — leave teks_codes empty)";

  return `Course: ${input.courseDisplayName}
Unit: ${input.unitTitle}${input.unitTeksFocusSummary ? `\nUnit TEKS focus: ${input.unitTeksFocusSummary}` : ""}
Week ${input.weekNumber}: ${input.weekTitle}
Day: ${dayLabel} (day_number ${input.dayNumber})

Topic for this lesson: ${input.topic}
${input.notes ? `\nTeacher's notes: ${input.notes}` : ""}

Candidate TEKS codes for this course (choose only from this list):
${teksList}

Generate the complete lesson now.`;
}

export async function generateLesson(
  input: GenerateLessonInput,
): Promise<GenerateLessonResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(generatedLessonSchema),
      },
      system: buildGenerateLessonSystemPrompt(),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The AI declined to generate this lesson. Try rephrasing the topic or notes.",
      };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error:
          "The AI's response didn't match the expected lesson format. Try again — this usually succeeds on retry.",
      };
    }

    return { ok: true, lesson: message.parsed_output };
  } catch (error) {
    console.error("generateLesson failed", error);
    return {
      ok: false,
      error: "Lesson generation failed unexpectedly. Try again in a moment.",
    };
  }
}
