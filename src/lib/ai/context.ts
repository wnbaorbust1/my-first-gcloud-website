import "server-only";

import { topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { getMyBlueprintData } from "@/lib/blueprint/data";
import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";
import { EMPTY_RESOURCES, parseSection, resourcesSectionSchema } from "@/lib/validations/vision-board-data";

const MAX_SECTION_CHARS = 500;
const MAX_NOTE_CHARS = 300;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/**
 * AI CONTEXT (spec Prompt 7): everything Blueprint AI is allowed to see
 * about a business, assembled fresh on every message so it's always
 * current — never a stale cached snapshot. Every field listed in the
 * spec's AI CONTEXT section is either included directly or noted as
 * genuinely empty; nothing here is invented.
 *
 * "Previous AI conversations" (also spec AI CONTEXT) isn't assembled
 * here — that's the conversation's own message history, passed straight
 * through as prior turns in client.ts, which is the correct way for a
 * chat model to see prior context rather than summarizing it into this
 * block.
 *
 * "Facilitator-approved notes where appropriate" is interpreted as notes
 * a facilitator explicitly marked participant-visible or as a
 * recommendation — never a PRIVATE note, and never a TASK_RECOMMENDATION
 * (that's an internal signal the roadmap engine already acts on, not
 * something written for the member to read verbatim).
 */
export async function assembleAiContext(businessId: string): Promise<string> {
  const [business, assessment, roadmap, goals, notes, sectionsByStage] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true, categoryScores: true },
    }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    // USER GOALS (plural) — every active goal, not just the newest one, so
    // the AI is grounded in the member's full real goal set.
    prisma.goal.findMany({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.facilitatorNote.findMany({
      where: { businessId, noteType: { in: ["PARTICIPANT_VISIBLE", "RECOMMENDATION"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMyBlueprintData(businessId),
  ]);

  const lines: string[] = [];

  lines.push(`Business: ${business.name}`);
  if (business.industry) lines.push(`Industry: ${business.industry}`);
  if (business.businessStage) lines.push(`Stage: ${business.businessStage}`);
  if (business.primaryProductOrService)
    lines.push(`Products/Services (from profile): ${truncate(business.primaryProductOrService, MAX_SECTION_CHARS)}`);
  if (business.idealCustomer)
    lines.push(`Ideal Customer (from profile): ${truncate(business.idealCustomer, MAX_SECTION_CHARS)}`);
  if (business.primaryGoal) lines.push(`Primary Goal: ${truncate(business.primaryGoal, MAX_SECTION_CHARS)}`);
  if (business.primaryChallenge)
    lines.push(`Primary Challenge: ${truncate(business.primaryChallenge, MAX_SECTION_CHARS)}`);

  if (assessment) {
    const stageLine = STAGES.map((s) => {
      const score = assessment.scores.find((sc) => sc.stage === s)?.scorePercent;
      return `${s} ${score ?? "—"}%`;
    }).join(", ");
    lines.push(`Assessment Scores: ${stageLine}${assessment.healthScorePercent !== null ? ` (Business Health ${assessment.healthScorePercent}%)` : ""}`);

    const categoryScores = assessment.categoryScores.map((c) => ({
      stage: c.stage as Stage,
      category: c.category,
      scorePercent: c.scorePercent,
    }));
    const { strengths, priorities } = topStrengthsAndPriorities(categoryScores);
    if (strengths.length)
      lines.push(`Top Strengths: ${strengths.map((s) => `${s.category} (${s.scorePercent}%)`).join(", ")}`);
    if (priorities.length)
      lines.push(`Top Priority Gaps: ${priorities.map((p) => `${p.category} (${p.scorePercent}%)`).join(", ")}`);
    // ASSIGNED STAGE — the scoring waterfall's actual recommendation
    // (Passion/Power/Legacy/Growth), not just the raw per-stage scores.
    if (assessment.recommendedSessionType) {
      lines.push(
        `Assigned Stage: ${assessment.recommendedSessionType}${
          assessment.recommendationReason ? ` — ${truncate(assessment.recommendationReason, MAX_SECTION_CHARS)}` : ""
        }`,
      );
    }
  } else {
    lines.push("Assessment Scores: not completed yet.");
  }

  if (goals.length) {
    lines.push(
      `Active Goals: ${goals
        .map((g) => `${g.title}${g.progressPercent ? ` (${g.progressPercent}% progress)` : ""}`)
        .join("; ")}`,
    );
  }

  if (roadmap) {
    const completed = roadmap.tasks.filter((t) => t.status === "COMPLETED");
    const inProgress = roadmap.tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "NOT_STARTED");
    if (completed.length)
      lines.push(`Completed Roadmap Tasks: ${completed.map((t) => t.title).join(", ")}`);
    if (inProgress.length)
      lines.push(`Current/Upcoming Roadmap Tasks: ${inProgress.slice(0, 8).map((t) => t.title).join(", ")}`);
  }

  const populatedSections = STAGES.flatMap((stage) =>
    sectionsByStage[stage].filter((s) => s.content),
  );
  if (populatedSections.length) {
    lines.push("Saved Blueprint Sections:");
    for (const s of populatedSections) {
      lines.push(`- ${s.title}: ${truncate(s.content!, MAX_SECTION_CHARS)}`);
    }
  }

  if (notes.length) {
    lines.push("Facilitator Notes (shared with this member):");
    for (const n of notes) {
      lines.push(`- ${truncate(n.note, MAX_NOTE_CHARS)}`);
    }
  }

  return lines.join("\n");
}

const MAX_ANSWERS_IN_CONTEXT = 40;

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * VISION BOARD GENERATION CONTEXT (Phase 3: AI Blueprint Generator) —
 * everything `assembleAiContext` already gives Blueprint AI chat, plus
 * two blocks that are specific to drafting a Vision Board and too heavy
 * to add to every ordinary chat turn: the member's actual raw assessment
 * answers (not just the aggregate scores chat already sees) and their
 * current Resources section (what they've said they Have/Need), so the
 * model can draft grounded in the member's own words, not just numbers.
 */
export async function assembleVisionBoardGenerationContext(businessId: string): Promise<string> {
  const baseContext = await assembleAiContext(businessId);

  const [assessment, profile] = await Promise.all([
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: {
        responses: {
          include: { question: { select: { prompt: true, questionType: true, includeInScoring: true } } },
          take: MAX_ANSWERS_IN_CONTEXT,
        },
      },
    }),
    prisma.visionBoardProfile.findUnique({ where: { businessId }, select: { resources: true } }),
  ]);

  const lines: string[] = [baseContext];

  if (assessment?.responses.length) {
    lines.push("Raw Assessment Answers (the member's own responses, not just the aggregate scores above):");
    for (const r of assessment.responses) {
      lines.push(`- ${r.question.prompt} → ${formatAnswerValue(r.value)}`);
    }
  }

  const resources = parseSection(resourcesSectionSchema, profile?.resources, EMPTY_RESOURCES);
  if (resources.have.length || resources.need.length) {
    lines.push("Current Resources (from the member's Vision Board Profile):");
    if (resources.have.length) lines.push(`- Has: ${resources.have.join(", ")}`);
    if (resources.need.length) lines.push(`- Needs: ${resources.need.join(", ")}`);
  }

  return lines.join("\n");
}
