import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { buildFillGapsSystemPrompt } from "@/lib/ai/prompts";
import { gapSuggestionsSchema, type GapSuggestion } from "@/lib/ai/schemas";
import { DAY_LABELS } from "@/lib/curriculum/constants";

export type FillGapsInput = {
  courseDisplayName: string;
  unitTitle: string;
  unitTeksFocusSummary: string | null;
  weeks: {
    weekNumber: number;
    title: string;
    existingLessons: { dayNumber: number; title: string }[];
  }[];
  /** The (week_number, day_number) slots to suggest topics for. */
  emptySlots: { weekNumber: number; dayNumber: number }[];
};

export type FillGapsResult =
  | { ok: true; suggestions: GapSuggestion[] }
  | { ok: false; error: string };

function buildUserMessage(input: FillGapsInput): string {
  const weeksText = input.weeks
    .map((week) => {
      const existing =
        week.existingLessons.length > 0
          ? week.existingLessons
              .map((l) => `    ${DAY_LABELS[l.dayNumber] ?? `Day ${l.dayNumber}`}: ${l.title}`)
              .join("\n")
          : "    (no lessons yet)";
      return `  Week ${week.weekNumber}: ${week.title}\n${existing}`;
    })
    .join("\n\n");

  const emptySlotsText = input.emptySlots
    .map(
      (slot) =>
        `  week_number=${slot.weekNumber}, day_number=${slot.dayNumber} (${DAY_LABELS[slot.dayNumber] ?? `Day ${slot.dayNumber}`})`,
    )
    .join("\n");

  return `Course: ${input.courseDisplayName}
Unit: ${input.unitTitle}${input.unitTeksFocusSummary ? `\nUnit TEKS focus: ${input.unitTeksFocusSummary}` : ""}

Weeks in this unit and what's already planned:
${weeksText}

Empty slots to suggest a topic for (suggest exactly one topic per slot listed):
${emptySlotsText}`;
}

/**
 * Suggests lesson topics for a unit's empty (week, day) slots, grounded in
 * the unit's TEKS focus and what's already taught in the surrounding
 * slots. Returns only what's requested — full lesson generation is a
 * separate step the teacher triggers per suggestion.
 */
export async function fillCurriculumGaps(
  input: FillGapsInput,
): Promise<FillGapsResult> {
  if (input.emptySlots.length === 0) {
    return { ok: true, suggestions: [] };
  }

  const client = getAnthropicClient();

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(gapSuggestionsSchema),
      },
      system: buildFillGapsSystemPrompt(),
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined to generate suggestions." };
    }

    if (!message.parsed_output) {
      return {
        ok: false,
        error: "The AI's response wasn't in the expected format. Try again.",
      };
    }

    // Defensive: only keep suggestions for slots we actually asked about —
    // don't trust the model not to invent or duplicate a slot.
    const validSlots = new Set(
      input.emptySlots.map((s) => `${s.weekNumber}:${s.dayNumber}`),
    );
    const seen = new Set<string>();
    const suggestions = message.parsed_output.suggestions.filter((s) => {
      const key = `${s.week_number}:${s.day_number}`;
      if (!validSlots.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { ok: true, suggestions };
  } catch (error) {
    console.error("fillCurriculumGaps failed", error);
    return { ok: false, error: "Suggesting lessons failed unexpectedly. Try again." };
  }
}
