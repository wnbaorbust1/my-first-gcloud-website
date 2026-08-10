import type { AiMode } from "@/generated/prisma/enums";

/** What a Builder task action button knows about the task it's attached to. */
export interface BuilderTaskPromptContext {
  title: string;
  category: string;
  whyItMatters: string;
  /** Current BUILD-step answers, label -> answer text (empty string if unanswered). */
  steps: { label: string; prompt: string; answer: string }[];
}

export interface AiActionMeta {
  key: string;
  label: string;
  defaultMode: AiMode;
  /** Builds the user-turn message this button sends, given the task it's attached to. */
  buildPrompt: (ctx: BuilderTaskPromptContext) => string;
}

function stepsBlock(ctx: BuilderTaskPromptContext, onlyAnswered = false): string {
  const steps = onlyAnswered ? ctx.steps.filter((s) => s.answer.trim()) : ctx.steps;
  return steps
    .map((s) => `- ${s.label}: ${s.answer.trim() || "(not answered yet)"}`)
    .join("\n");
}

/**
 * AI ACTIONS (spec Prompt 7) — the 9 buttons added throughout Builder.
 * Each is a Business Builder task page action: given the task the member
 * is currently working on (title, why it matters, and their current
 * draft answers), build the exact user-turn message to send. The
 * business/assessment/roadmap context is layered in separately by
 * context.ts — these prompts stay focused on *this task*.
 */
export const AI_ACTIONS: AiActionMeta[] = [
  {
    key: "ASK_BLUEPRINT_AI",
    label: "Ask Blueprint AI",
    defaultMode: "BUSINESS_COACH",
    buildPrompt: (ctx) =>
      `I'm working on the Builder task "${ctx.title}." I have a question about it — I'll type it below.`,
  },
  {
    key: "HELP_ME_ANSWER",
    label: "Help Me Answer",
    defaultMode: "IMPLEMENTATION_GUIDE",
    buildPrompt: (ctx) =>
      `I'm working on the Builder task "${ctx.title}" (${ctx.category}). Help me answer these questions for my business, one at a time if that's easier:\n${stepsBlock(ctx)}`,
  },
  {
    key: "IMPROVE_THIS",
    label: "Improve This",
    defaultMode: "COPYWRITER",
    buildPrompt: (ctx) =>
      `Here's what I've drafted so far for "${ctx.title}." Improve it — make it sharper and more specific to my business:\n${stepsBlock(ctx, true) || "(nothing drafted yet)"}`,
  },
  {
    key: "EXPLAIN_THIS",
    label: "Explain This",
    defaultMode: "BUSINESS_COACH",
    buildPrompt: (ctx) =>
      `Explain the Builder task "${ctx.title}" in plain, beginner-friendly terms — what it's really asking for and why it matters for a business like mine. (Its stated purpose: "${ctx.whyItMatters}")`,
  },
  {
    key: "SHOW_ME_AN_EXAMPLE",
    label: "Show Me an Example",
    defaultMode: "STRATEGIST",
    buildPrompt: (ctx) =>
      `Show me a concrete, realistic example of "${ctx.title}" done well for a business like mine — something I could model my own answer on.`,
  },
  {
    key: "BUILD_THIS_WITH_ME",
    label: "Build This With Me",
    defaultMode: "SYSTEMS_BUILDER",
    buildPrompt: (ctx) =>
      `Walk me through "${ctx.title}" step by step — ask me one question at a time so we build my answer together instead of me starting from a blank page.`,
  },
  {
    key: "MAKE_THIS_SIMPLER",
    label: "Make This Simpler",
    defaultMode: "COPYWRITER",
    buildPrompt: (ctx) =>
      `This feels like a lot. Simplify "${ctx.title}" for me — what's the simplest version of this I could do today, based on what I've already got?\n${stepsBlock(ctx, true)}`,
  },
  {
    key: "CHECK_MY_WORK",
    label: "Check My Work",
    defaultMode: "STRATEGIST",
    buildPrompt: (ctx) =>
      `Review what I've drafted for "${ctx.title}" and tell me honestly what's missing or weak:\n${stepsBlock(ctx, true) || "(nothing drafted yet)"}`,
  },
  {
    key: "CREATE_A_FIRST_DRAFT",
    label: "Create a First Draft",
    defaultMode: "COPYWRITER",
    buildPrompt: (ctx) =>
      `Write a first draft for "${ctx.title}" based on my business, that I can then edit. Cover each of these:\n${stepsBlock(ctx)}`,
  },
];

export const AI_ACTION_BY_KEY: Record<string, AiActionMeta> = Object.fromEntries(
  AI_ACTIONS.map((a) => [a.key, a]),
);
