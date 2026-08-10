import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildAssistantSystemPrompt } from "@/lib/ai/prompts";
import {
  assistantEditSchema,
  type AssistantEdit,
  type LessonSnapshot,
} from "@/lib/ai/schemas";

function formatLessonSnapshot(lesson: LessonSnapshot): string {
  const segmentsText = lesson.segments
    .map(
      (s) =>
        `  - ${s.segment_key} (${s.duration_minutes} min): ${s.title}\n    ${s.description ?? "(no description yet)"}`,
    )
    .join("\n");

  const homeworkText =
    lesson.homework.length > 0
      ? lesson.homework.map((q, i) => `  ${i + 1}. ${q}`).join("\n")
      : "  (none written yet)";

  return `Title: ${lesson.title || "(untitled)"}

Class period segments:
${segmentsText || "  (none yet)"}

Gradual release:
  I Do: ${lesson.i_do ?? "(not written yet)"}
  We Do: ${lesson.we_do ?? "(not written yet)"}
  You Do Together: ${lesson.you_do_together ?? "(not written yet)"}
  You Do: ${lesson.you_do ?? "(not written yet)"}

QSSSA:
  Question: ${lesson.qsssa_question ?? "(not written yet)"}
  Signal: ${lesson.qsssa_signal ?? "(not written yet)"}
  Stem: ${lesson.qsssa_stem ?? "(not written yet)"}
  Share: ${lesson.qsssa_share ?? "(not written yet)"}
  Assess: ${lesson.qsssa_assess ?? "(not written yet)"}

Homework:
${homeworkText}`;
}

export type AssistantEditResult =
  | { ok: true; edit: AssistantEdit }
  | { ok: false; error: string };

/**
 * One turn of the AI Lesson Assistant: given the lesson as it currently
 * stands (including any unsaved edits already made in the editor) and a
 * teacher's instruction, returns an updated version of exactly one field.
 * Stateless by design — each call gets the full current snapshot rather
 * than replaying a conversation, so it always edits against what's
 * actually in the form right now.
 */
export async function requestLessonAssistantEdit(
  lesson: LessonSnapshot,
  instruction: string,
): Promise<AssistantEditResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(assistantEditSchema),
      },
      system: buildAssistantSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Current lesson:\n\n${formatLessonSnapshot(lesson)}\n\nTeacher's instruction: ${instruction}`,
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined that request." };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response wasn't in the expected format. Try rephrasing.",
      };
    }

    return { ok: true, edit: message.parsed_output };
  } catch (error) {
    console.error("requestLessonAssistantEdit failed", error);
    return { ok: false, error: "The assistant request failed unexpectedly. Try again." };
  }
}
