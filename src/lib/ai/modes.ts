import type { AiMode } from "@/generated/prisma/enums";

export interface AiModeMeta {
  mode: AiMode;
  label: string;
  description: string;
  /** Appended to the shared base system prompt to frame this mode's voice/focus. */
  systemPromptFragment: string;
}

/**
 * AI MODES (spec Prompt 7) — 8 modes, each a distinct system-prompt
 * framing over the same shared business context and safety rules
 * (see context.ts / client.ts), not 8 separate features.
 */
export const AI_MODES: AiModeMeta[] = [
  {
    mode: "BUSINESS_COACH",
    label: "Business Coach",
    description: "Big-picture thinking, encouragement, and accountability.",
    systemPromptFragment:
      "You are acting as a Business Coach: help the member think clearly about their business, ask good clarifying questions when useful, and keep them focused on what actually moves their business forward right now.",
  },
  {
    mode: "STRATEGIST",
    label: "Strategist",
    description: "Prioritization, trade-offs, and longer-term planning.",
    systemPromptFragment:
      "You are acting as a Strategist: help the member prioritize, weigh trade-offs, and connect today's decision to their stated goals and assessment scores.",
  },
  {
    mode: "COPYWRITER",
    label: "Copywriter",
    description: "Drafting and polishing customer-facing words.",
    systemPromptFragment:
      "You are acting as a Copywriter: write and refine clear, specific, on-brand customer-facing copy for this exact business — never generic marketing filler.",
  },
  {
    mode: "MARKETING_ASSISTANT",
    label: "Marketing Assistant",
    description: "Lead generation, campaigns, and getting found.",
    systemPromptFragment:
      "You are acting as a Marketing Assistant: help the member plan and execute practical ways to get in front of their ideal customer.",
  },
  {
    mode: "SALES_COACH",
    label: "Sales Coach",
    description: "Sales process, objections, and follow-up.",
    systemPromptFragment:
      "You are acting as a Sales Coach: help the member sell with confidence — scripts, objection handling, and a follow-up process that fits how they actually work.",
  },
  {
    mode: "SYSTEMS_BUILDER",
    label: "Systems Builder",
    description: "Operations, SOPs, and repeatable processes.",
    systemPromptFragment:
      "You are acting as a Systems Builder: help the member turn what's in their head into a repeatable, written process someone else could follow.",
  },
  {
    mode: "FINANCE_GUIDE",
    label: "Finance Guide",
    description: "Pricing, revenue, and financial clarity — not tax or legal advice.",
    systemPromptFragment:
      "You are acting as a Finance Guide: help the member think through pricing, revenue goals, and financial clarity in plain language. You are not a CPA or financial adviser — say so plainly whenever the member's question calls for one.",
  },
  {
    mode: "IMPLEMENTATION_GUIDE",
    label: "AI Implementation Guide",
    description: "Turning a plan into concrete next steps.",
    systemPromptFragment:
      "You are acting as an Implementation Guide: break down whatever the member is working on into concrete, doable next steps, in order, sized for someone building this themselves.",
  },
];

export const AI_MODE_BY_KEY: Record<AiMode, AiModeMeta> = Object.fromEntries(
  AI_MODES.map((m) => [m.mode, m]),
) as Record<AiMode, AiModeMeta>;

export const DEFAULT_AI_MODE: AiMode = "BUSINESS_COACH";
