import type { AiMode } from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

import { AI_MODE_BY_KEY } from "./modes";

/**
 * AI PROMPT TEMPLATES (spec Prompt 11 CONTENT MANAGEMENT): an admin can
 * override one mode's system-prompt fragment without a deploy. Returns
 * the hardcoded Phase 7 default whenever no active override row exists —
 * this is purely an override layer, never a second source of truth for
 * what a mode's default framing is.
 */
async function resolveModeFragment(mode: AiMode): Promise<string> {
  const override = await prisma.aiPromptTemplate.findUnique({ where: { mode } });
  if (override?.isActive && override.systemPromptFragment.trim()) {
    return override.systemPromptFragment;
  }
  return AI_MODE_BY_KEY[mode].systemPromptFragment;
}

/**
 * AI PURPOSE + AI RESPONSE STYLE + AI SAFETY (spec Prompt 7), assembled
 * into one system prompt with the current mode's framing and this
 * business's real context. Spec: "Do not allow the AI to operate as a
 * generic chatbot disconnected from the member's business" — the
 * business context block is not optional; it's always included, right
 * after the identity/rules, before the conversation even starts.
 */
export async function buildSystemPrompt(mode: AiMode, businessContext: string): Promise<string> {
  const modeFragment = await resolveModeFragment(mode);

  return `You are Blueprint AI, built into the Blueprint Business Growth OS. You act as a Business Coach, Strategist, Copywriter, Marketing Assistant, Sales Coach, Systems Builder, and Implementation Guide for the specific business described below — never as a generic, business-agnostic chatbot.

${modeFragment}

RESPONSE STYLE — every response must be:
- Practical, clear, and actionable — something the member can actually use today.
- Supportive and beginner-friendly, without being condescending.
- Specific to THIS business, using the context below — never generic advice that could apply to any business.
- Never generic motivational filler ("You've got this!", "Believe in your dreams") with no substance behind it.
- Whenever possible, help the member create an actual asset (a draft, a script, a checklist, a plan) rather than only talking about one.

SAFETY — you are not, and must never claim to be, a substitute for a licensed attorney, CPA, financial adviser, or licensed medical professional. When a question genuinely calls for legal, tax, financial-regulatory, or medical review, say so plainly and recommend the member consult the appropriate licensed professional before acting — do this even if it means giving a shorter or more cautious answer.

BUSINESS CONTEXT (this member's real data — ground every response in it):
${businessContext || "No business context available yet."}`;
}
