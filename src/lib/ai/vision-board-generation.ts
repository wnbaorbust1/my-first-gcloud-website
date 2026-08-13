import "server-only";

import { callBlueprintAi, isAiConfigured } from "@/lib/ai/client";
import { assembleAiContext } from "@/lib/ai/context";
import { logError } from "@/lib/observability/log-error";
import {
  visionBoardGenerationOutputSchema,
  type VisionBoardGenerationOutput,
} from "@/lib/validations/vision-board-generation";

export type VisionBoardGenerationResult =
  | { ok: true; payload: VisionBoardGenerationOutput; model: string }
  | { ok: false; reason: "not_configured" | "invalid_response"; message: string };

const NOT_CONFIGURED_MESSAGE =
  "Blueprint AI isn't fully connected in this environment yet — no AI provider key is configured, so a draft can't be generated right now. Every other part of your Vision Board still works normally; you can fill sections in yourself, and drafting will work the moment a key is added.";

const INVALID_RESPONSE_MESSAGE =
  "Blueprint AI didn't return a usable draft that time — nothing was saved. Try generating again in a moment.";

const OUTPUT_SHAPE = `{
  "myStory": string | null,
  "myWhy": string | null,
  "legacyImpact": string | null,
  "actionPlanThisWeek": string | null,
  "actionPlanThisMonth": string | null,
  "dailyAffirmations": string[] | null
}`;

/**
 * VISION BOARD GENERATION — SYSTEM PROMPT (Vision Board & Blueprint
 * Generator, audited 2026-08-13): the rendering constraint is explicit —
 * "the AI's role is limited to generating structured recommendations
 * returned as validated JSON; the application places that JSON into the
 * branded template." So unlike Blueprint AI chat (src/lib/ai/system-prompt.ts),
 * this prompt demands ONLY a JSON object back, no prose, and is told to
 * use null rather than invent facts the real context doesn't support —
 * this app's "never fabricate" convention applied to a generative field.
 */
function buildPrompt(businessContext: string): string {
  return `You are Blueprint AI, drafting suggested narrative content for one member's Vision Board inside the Blueprint Business Growth OS. This is a DRAFTING task, not a conversation — the member will review, edit, and choose to accept or discard each field themselves before anything is saved to their real profile.

Ground every sentence in the real business context below. Never invent specific facts — numbers, dates, names, past events — that are not present in that context. If the context genuinely doesn't give you enough to draft something specific and non-generic for a field, return null for that field rather than writing generic filler.

Write each field in the business owner's own first-person voice ("I..."), warm and grounded, never generic motivational filler ("You've got this!", "Believe in your dreams") with no substance behind it.

Field guide:
- myStory: 2-4 sentences on how this business came to be and what it does, grounded in the business profile below.
- myWhy: 2-4 sentences on the deeper motivation/purpose behind the business — the "why," not just the "what."
- legacyImpact: 2-4 sentences on the lasting impact or legacy this business owner wants this business to leave.
- actionPlanThisWeek: 1-3 concrete, specific actions for the next 7 days, grounded in the actual current/upcoming roadmap tasks and priority gaps below (not generic advice).
- actionPlanThisMonth: 1-3 concrete, specific actions for the next 30 days, same grounding.
- dailyAffirmations: 3-5 short, first-person affirmation statements that reflect this specific business's real strengths and goals from the context below, not generic self-help lines.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after it, matching exactly this shape:
${OUTPUT_SHAPE}

BUSINESS CONTEXT (this member's real data — ground every field in it, and use null wherever it doesn't give you enough to draft something specific):
${businessContext || "No business context available yet."}`;
}

/** Strips a ```json ... ``` fence if the model wraps its output in one despite being told not to. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]!.trim() : trimmed;
}

export async function generateVisionBoardRecommendations(
  businessId: string,
): Promise<VisionBoardGenerationResult> {
  if (!isAiConfigured()) {
    return { ok: false, reason: "not_configured", message: NOT_CONFIGURED_MESSAGE };
  }

  const businessContext = await assembleAiContext(businessId);
  const systemPrompt = buildPrompt(businessContext);
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const raw = await callBlueprintAi({
    systemPrompt,
    history: [{ role: "user", content: "Generate the JSON draft now." }],
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripCodeFence(raw));
  } catch (err) {
    await logError(err, { route: "ai/vision-board-generation", detail: raw.slice(0, 500) });
    return { ok: false, reason: "invalid_response", message: INVALID_RESPONSE_MESSAGE };
  }

  const validated = visionBoardGenerationOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    await logError(new Error("Vision board generation failed schema validation"), {
      route: "ai/vision-board-generation",
      issues: validated.error.issues.map((i) => i.message).join("; "),
    });
    return { ok: false, reason: "invalid_response", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, payload: validated.data, model };
}
