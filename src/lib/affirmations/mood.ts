import "server-only";

import type { Mood } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * MOOD CHECK-IN & ADAPTIVE RESPONSE (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md
 * §7, Phase B — pilot-scoped).
 *
 * What's built: a real mood check-in the member can open any time
 * ("How are you feeling?"), persisted to MoodCheckIn, with a genuinely
 * adaptive response per spec §7's mapping table — not a generic
 * "thanks for sharing."
 *
 * What's deliberately deferred: the spec's PROACTIVE trigger list
 * (fires automatically after a hard task, several incomplete actions,
 * inactivity return, a reached milestone, weekly review start, or a
 * user-chosen time) needs real scheduling/rate-limiting infrastructure
 * this pilot doesn't build yet — see BUILD_STATUS.md's Phase B entry.
 * Shipping a real self-serve version now (member opens it when they
 * want to) beats a half-built proactive one, and per the ADHD-friendly
 * design requirement ratified in BLUEPRINT_MASTER_SPEC.md, an
 * uninterrupted flow the member controls is itself a defensible design
 * choice, not just a scope cut.
 */
export interface MoodResponse {
  message: string;
  /** A concrete next step, when there is one — surfaced as a CTA link in the UI. */
  suggestion?: { label: string; href: string };
}

const RESPONSES: Record<Mood, MoodResponse> = {
  OVERWHELMED: {
    message: "That's real — let's shrink this down to one small thing instead.",
    suggestion: { label: "Show me a Quick Step", href: "/build" },
  },
  STUCK: {
    message: "Stuck is normal, not a sign you're behind. A smaller step or an example usually unsticks it.",
    suggestion: { label: "Break this into smaller steps", href: "/ai" },
  },
  CONFUSED: {
    message: "Let's make this simpler — ask Blueprint AI to explain it a different way.",
    suggestion: { label: "Ask Blueprint AI", href: "/ai" },
  },
  DISCOURAGED: {
    message: "Here's real proof you're moving: your progress so far is on your dashboard, not in your head.",
    suggestion: { label: "See how far you've come", href: "/progress" },
  },
  TIRED: {
    message: "Fair — protect your streak with one Quick Step, or rest on purpose. Both count as taking care of the business.",
    suggestion: { label: "Show me a Quick Step", href: "/build" },
  },
  READY_TO_WORK: {
    message: "Let's go — here's your next best move.",
    suggestion: { label: "Go to Build", href: "/build" },
  },
  NEED_SMALLER_STEP: {
    message: "Good call asking for that instead of forcing it. Here's something smaller to start with.",
    suggestion: { label: "Break this into smaller steps", href: "/ai" },
  },
  FOCUSED: {
    message: "Good — ride it. Here's what's next.",
    suggestion: { label: "Go to Build", href: "/build" },
  },
  CONFIDENT: {
    message: "Use it — this is a good moment for a bigger step, not just a quick one.",
    suggestion: { label: "Go to Build", href: "/build" },
  },
  EXCITED: {
    message: "Love that. Let's put it toward something real before it fades.",
    suggestion: { label: "Go to Build", href: "/build" },
  },
};

export function getAdaptiveResponse(mood: Mood): MoodResponse {
  return RESPONSES[mood];
}

export async function submitMoodCheckIn(businessId: string, mood: Mood, note?: string): Promise<MoodResponse> {
  await prisma.moodCheckIn.create({ data: { businessId, mood, note } });
  return getAdaptiveResponse(mood);
}
