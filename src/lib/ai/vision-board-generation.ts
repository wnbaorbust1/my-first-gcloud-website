import "server-only";

import { topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { callBlueprintAi, isAiConfigured } from "@/lib/ai/client";
import { assembleVisionBoardGenerationContext } from "@/lib/ai/context";
import { logError } from "@/lib/observability/log-error";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";
import {
  visionBoardGenerationOutputSchema,
  type VisionBoardGenerationOutput,
} from "@/lib/validations/vision-board-generation";

export type VisionBoardGenerationSource = "ai" | "rules_based";

/**
 * Always succeeds — "if AI generation fails, produce a rules-based
 * result instead" (Phase 3: AI Blueprint Generator). `source` tells the
 * caller (and, via `VisionBoardGeneration.model`, the stored record)
 * which path actually produced this payload: a real Claude call, or the
 * deterministic template fallback below. Both are validated against the
 * exact same schema, so nothing downstream has to care which one ran.
 */
export interface VisionBoardGenerationResult {
  payload: VisionBoardGenerationOutput;
  model: string;
  source: VisionBoardGenerationSource;
}

const OUTPUT_SHAPE = `{
  "myStory": { "passionStatement": string | null, "superpowers": string[] },
  "myWhy": { "whyStatement": string | null, "problemToSolve": string | null, "peopleToHelp": string[] },
  "legacy": { "legacyStatement": string | null, "impactGroups": string[] },
  "actionPlan": { "thisWeek": string[], "thisMonth": string[], "firstStep": string | null },
  "affirmations": string[]
}`;

/**
 * VISION BOARD GENERATION — SYSTEM PROMPT (Vision Board & Blueprint
 * Generator, Phase 3: AI Blueprint Generator, audited 2026-08-13): the
 * rendering constraint is explicit — "the AI's role is limited to
 * generating structured recommendations returned as validated JSON; the
 * application places that JSON into the branded template." So unlike
 * Blueprint AI chat (src/lib/ai/system-prompt.ts), this prompt demands
 * ONLY a JSON object back, no prose, and enumerates the specific
 * categories of fabrication most likely to slip through a vague
 * "don't invent" instruction: businesses, revenue, contacts, achievements.
 */
function buildPrompt(businessContext: string): string {
  return `You are Blueprint AI, drafting suggested narrative content for one member's Vision Board inside the Blueprint Business Growth OS. This is a DRAFTING task, not a conversation — the member will review, edit, and choose to accept or discard each field themselves before anything is saved to their real profile.

Ground every sentence in the real business context below. Never invent specific facts that are not present in that context — most importantly:
- Never invent a business, product, or service the member doesn't already have listed.
- Never invent a revenue figure, dollar amount, or other number.
- Never invent a contact name, email address, phone number, or partner/organization name.
- Never invent an achievement, award, credential, or past event.
If the context genuinely doesn't give you enough to draft something specific and non-generic for a field, use null (for a single string) or an empty array (for a list) rather than writing generic filler or guessing.

Write every string in the business owner's own first-person voice ("I..."), warm and grounded, never generic motivational filler ("You've got this!", "Believe in your dreams") with no substance behind it. Every array is a list of short, distinct items — not one long sentence split across entries. Keep every field short enough to fit one small panel of a printed worksheet: 1-2 sentences per statement, 2-5 short items per list.

Field guide (structured, not paragraphs — each list is its own array of short items):
- myStory.passionStatement: 1-2 sentences on how this business came to be and what it does.
- myStory.superpowers: 2-5 short phrases naming what this person is genuinely good at, grounded in the context (e.g. "Bringing people together," "Turning ideas into action").
- myWhy.whyStatement: 1-2 sentences on the deeper motivation/purpose behind the business.
- myWhy.problemToSolve: 1 sentence naming the real problem this business exists to solve.
- myWhy.peopleToHelp: 2-5 short phrases naming who this business serves.
- legacy.legacyStatement: 1-2 sentences on the lasting impact this business owner wants to leave.
- legacy.impactGroups: 2-6 short phrases naming who/what that impact reaches (e.g. "My Family," "My Community," "Future Generations").
- actionPlan.thisWeek: up to 3 concrete, specific actions for the next 7 days, grounded in the actual current/upcoming roadmap tasks and priority gaps in the context below (not generic advice).
- actionPlan.thisMonth: up to 3 concrete, specific actions for the next 30 days, same grounding.
- actionPlan.firstStep: the single most important one of the above to do first, or null if nothing was grounded enough to draft.
- affirmations: up to 5 short, first-person affirmation statements that reflect this specific business's real strengths and goals from the context below, not generic self-help lines.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after it, matching exactly this shape:
${OUTPUT_SHAPE}

BUSINESS CONTEXT (this member's real data — ground every field in it, including their own raw assessment answers and current resources below, and use null/[] wherever it doesn't give you enough to draft something specific):
${businessContext || "No business context available yet."}`;
}

/** Strips a ```json ... ``` fence if the model wraps its output in one despite being told not to. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]!.trim() : trimmed;
}

/** Attempts a real Claude generation; returns null (never throws) if unavailable, unparseable, or schema-invalid — every failure path falls through to the rules-based generator instead. */
async function tryAiGeneration(businessId: string): Promise<VisionBoardGenerationResult | null> {
  if (!isAiConfigured()) return null;

  const businessContext = await assembleVisionBoardGenerationContext(businessId);
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
    return null;
  }

  const validated = visionBoardGenerationOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    await logError(new Error("Vision board generation failed schema validation"), {
      route: "ai/vision-board-generation",
      issues: validated.error.issues.map((i) => i.message).join("; "),
    });
    return null;
  }

  return { payload: validated.data, model, source: "ai" };
}

/**
 * RULES-BASED FALLBACK (Phase 3: AI Blueprint Generator — "if AI
 * generation fails, produce a rules-based result instead"): a
 * deterministic generator with no model call at all, built entirely
 * from templates over the business's own already-real, already-stored
 * fields (never a synthesized fact) — so drafting still works with no
 * AI provider configured, or when a real call fails/returns something
 * unusable. Every leaf is either a direct real value, a short template
 * sentence built only from real values, or null/[] when there's
 * genuinely nothing safe to say.
 */
/** Keeps a templated sentence under the schema's cap even when the real field it's built from is long — truncation, not fabrication. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function generateRulesBasedRecommendations(businessId: string): Promise<VisionBoardGenerationOutput> {
  const [business, assessment, roadmap, activeGoals] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { categoryScores: true },
    }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" }, take: 6 } },
    }),
    prisma.goal.findMany({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const strengths = assessment
    ? topStrengthsAndPriorities(
        assessment.categoryScores.map((c) => ({
          stage: c.stage as Stage,
          category: c.category,
          scorePercent: c.scorePercent,
        })),
      ).strengths
    : [];

  const taskTitles = (roadmap?.tasks ?? []).map((t) => t.title);

  const passionStatement = business.primaryProductOrService
    ? truncate(
        `I run ${business.name}${business.industry ? `, a ${business.industry} business,` : ""} focused on ${business.primaryProductOrService}.`,
        400,
      )
    : null;

  const whyStatement = business.primaryGoal ? truncate(`My goal: ${business.primaryGoal}`, 400) : null;

  const legacyStatement = business.primaryGoal
    ? truncate(`I want ${business.name} to be known for ${business.primaryGoal}.`, 400)
    : null;

  const peopleToHelp = business.idealCustomer
    ? business.idealCustomer
        .split(",")
        .map((s) => truncate(s.trim(), 60))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const payload: VisionBoardGenerationOutput = {
    myStory: {
      passionStatement,
      superpowers: strengths.slice(0, 5).map((s) => s.category),
    },
    myWhy: {
      whyStatement,
      problemToSolve: business.primaryChallenge ? truncate(business.primaryChallenge, 300) : null,
      peopleToHelp,
    },
    legacy: {
      legacyStatement,
      impactGroups: peopleToHelp.slice(0, 6),
    },
    actionPlan: {
      thisWeek: taskTitles.slice(0, 3).map((t) => truncate(t, 150)),
      thisMonth: taskTitles.slice(3, 6).map((t) => truncate(t, 150)),
      firstStep: taskTitles[0] ? truncate(taskTitles[0], 150) : null,
    },
    affirmations: [
      ...strengths.slice(0, 3).map((s) => truncate(`I am strong in ${s.category}.`, 150)),
      ...activeGoals.slice(0, 2).map((g) => truncate(`I am working toward ${g.title}.`, 150)),
    ].slice(0, 5),
  };

  // Re-validated through the exact same schema an AI response goes
  // through — the fallback earns no special trust just because it's
  // deterministic; a future template change that overruns a limit
  // should fail loudly in tests, not silently ship an oversized board.
  return visionBoardGenerationOutputSchema.parse(payload);
}

export async function generateVisionBoardRecommendations(businessId: string): Promise<VisionBoardGenerationResult> {
  const aiResult = await tryAiGeneration(businessId);
  if (aiResult) return aiResult;

  const payload = await generateRulesBasedRecommendations(businessId);
  return { payload, model: "rules-based-v1", source: "rules_based" };
}
