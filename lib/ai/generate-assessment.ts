import "server-only";
import { randomUUID } from "node:crypto";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import {
  buildGenerateAssessmentSystemPrompt,
  buildRegenerateAssessmentSystemPrompt,
} from "@/lib/ai/prompts";
import { generatedAssessmentSchema, type GeneratedAssessment } from "@/lib/ai/schemas";
import type { Question } from "@/types/supabase";

export type GenerateAssessmentInput = {
  courseDisplayName: string;
  unitTitle: string;
  unitTeksFocusSummary: string | null;
  topic: string;
  notes?: string;
};

export type GenerateAssessmentResult =
  | { ok: true; title: string; questions: Question[]; answerKey: string }
  | { ok: false; error: string };

/** Stamps a stable client-facing id on every AI-generated question — the
 * model never assigns these (see generatedQuestionSchema). */
function withIds(assessment: GeneratedAssessment): Question[] {
  return assessment.questions.map((q) => ({ ...q, id: randomUUID() }));
}

function buildGenerateUserMessage(input: GenerateAssessmentInput): string {
  return `Course: ${input.courseDisplayName}
Unit: ${input.unitTitle}${input.unitTeksFocusSummary ? `\nUnit TEKS focus: ${input.unitTeksFocusSummary}` : ""}

Topic for this assessment: ${input.topic}
${input.notes ? `\nTeacher's notes: ${input.notes}` : ""}

Generate the complete assessment now.`;
}

export async function generateAssessment(
  input: GenerateAssessmentInput,
): Promise<GenerateAssessmentResult> {
  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(generatedAssessmentSchema),
      },
      system: buildGenerateAssessmentSystemPrompt(),
      messages: [{ role: "user", content: buildGenerateUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The AI declined to generate this assessment. Try rephrasing the topic or notes.",
      };
    }
    if (!message.parsed_output) {
      return {
        ok: false,
        error:
          "The AI's response didn't match the expected assessment format. Try again — this usually succeeds on retry.",
      };
    }

    return {
      ok: true,
      title: message.parsed_output.title,
      questions: withIds(message.parsed_output),
      answerKey: message.parsed_output.answer_key,
    };
  } catch (error) {
    console.error("generateAssessment failed", error);
    return { ok: false, error: "Assessment generation failed unexpectedly. Try again in a moment." };
  }
}

export type RegenerateVariantInput = {
  variant: "retake" | "modified";
  sourceTitle: string;
  sourceQuestions: Question[];
};

export type RegenerateVariantResult =
  | { ok: true; title: string; questions: Question[]; answerKey: string }
  | { ok: false; error: string };

function formatSourceQuestions(questions: Question[]): string {
  return questions
    .map((q, i) => {
      const parts = [`${i + 1}. [${q.type}, ${q.points} pt] ${q.prompt}`];
      if (q.options) parts.push(`   Options: ${q.options.join(" | ")}`);
      if (q.correct_answer) parts.push(`   Correct answer: ${q.correct_answer}`);
      if (q.pairs) parts.push(`   Pairs: ${q.pairs.map((p) => `${p.left} = ${p.right}`).join("; ")}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Produces a retake (new questions, same skills/difficulty) or modified
 * (simplified language/reduced choices, same questions) variant of an
 * existing assessment. Returns a fresh question set — the caller creates
 * a new `assessments` row with `variant_type` + `source_assessment_id`
 * set, exactly like generateAssessment() creates an original.
 */
export async function regenerateAssessmentVariant(
  input: RegenerateVariantInput,
): Promise<RegenerateVariantResult> {
  const client = getAnthropicClient();

  const userMessage = `Original assessment title: ${input.sourceTitle}

Original questions:
${formatSourceQuestions(input.sourceQuestions)}

Generate the ${input.variant} version now.`;

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(generatedAssessmentSchema),
      },
      system: buildRegenerateAssessmentSystemPrompt(input.variant),
      messages: [{ role: "user", content: userMessage }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined to generate that variant." };
    }
    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response wasn't in the expected format. Try again.",
      };
    }

    return {
      ok: true,
      title: message.parsed_output.title,
      questions: withIds(message.parsed_output),
      answerKey: message.parsed_output.answer_key,
    };
  } catch (error) {
    console.error("regenerateAssessmentVariant failed", error);
    return { ok: false, error: "Generating that variant failed unexpectedly. Try again." };
  }
}
