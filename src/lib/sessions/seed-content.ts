import "server-only";

import type { RecommendedSessionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

interface SessionOfferingSeed {
  sessionType: RecommendedSessionType;
  title: string;
  description: string;
  whoShouldAttend: string;
  topics: string[];
  learningOutcomes: string[];
  whatYoullBuild: string;
  whatToBring: string;
  startInDays: number;
  durationHours: number;
  capacity: number;
}

/**
 * Spec Task: "Create initial session templates: Blueprint Passion
 * Session, Blueprint Power Session, Blueprint Legacy Session." A Growth
 * session is included too since the scoring engine can recommend GROWTH
 * once all three stages clear the excellence threshold — without one,
 * that recommendation would have nothing to link to.
 *
 * `startInDays` is relative to seed time (not a fixed calendar date) so
 * these stay "upcoming" no matter when the app is first run.
 */
const SESSION_TEMPLATES: SessionOfferingSeed[] = [
  {
    sessionType: "PASSION",
    title: "Blueprint Passion Session",
    description:
      "A guided working session to get clear on why your business exists, who it's for, and what makes it different — the foundation everything else builds on.",
    whoShouldAttend:
      "Entrepreneurs who are still refining their purpose, ideal customer, or core message.",
    topics: ["Purpose & vision", "Ideal customer clarity", "Positioning", "12-month goals"],
    learningOutcomes: [
      "A one-sentence description of your business you can say with confidence",
      "A clear picture of your ideal customer",
      "One specific, measurable 12-month goal",
    ],
    whatYoullBuild: "Your Passion Blueprint: a one-page purpose, vision, and positioning statement.",
    whatToBring: "Whatever you already have written about your business — even messy notes.",
    startInDays: 10,
    durationHours: 2,
    capacity: 20,
  },
  {
    sessionType: "POWER",
    title: "Blueprint Power Session",
    description:
      "Turn your vision into consistent execution — pricing, marketing, sales, and the systems that keep revenue predictable.",
    whoShouldAttend:
      "Business owners who know what they offer but struggle with consistent marketing, sales, or operations.",
    topics: ["Pricing strategy", "Lead generation", "Sales process", "Operations & tracking"],
    learningOutcomes: [
      "A pricing strategy you can defend",
      "One lead-generation channel you'll run consistently",
      "A repeatable, written sales process",
    ],
    whatYoullBuild: "Your Power Blueprint: a one-page marketing and sales system.",
    whatToBring: "Your current pricing and a rough idea of where your leads come from today.",
    startInDays: 17,
    durationHours: 3,
    capacity: 20,
  },
  {
    sessionType: "LEGACY",
    title: "Blueprint Legacy Session",
    description:
      "Build the systems, team, and diversified value that let your business run — and grow — without you doing everything yourself.",
    whoShouldAttend:
      "Established business owners ready to delegate, systematize, and build long-term value.",
    topics: ["Delegation & team", "Documented systems", "Revenue diversification", "Succession"],
    learningOutcomes: [
      "A list of the next roles to hire or outsource",
      "One process fully documented and ready to hand off",
      "A first draft of your long-term wealth or succession plan",
    ],
    whatYoullBuild: "Your Legacy Blueprint: a systems and succession roadmap.",
    whatToBring: "A list of tasks only you currently do in the business.",
    startInDays: 24,
    durationHours: 3,
    capacity: 15,
  },
  {
    sessionType: "GROWTH",
    title: "Blueprint Growth Session",
    description:
      "For businesses already strong across Passion, Power, and Legacy — a strategy session focused on compounding growth and long-term impact.",
    whoShouldAttend: "Established owners with strong fundamentals looking for the next level.",
    topics: ["Scaling without burnout", "New revenue opportunities", "Strategic partnerships"],
    learningOutcomes: [
      "One new growth opportunity identified and scoped",
      "A plan to pursue it over the next 90 days",
    ],
    whatYoullBuild: "A 90-day growth plan.",
    whatToBring: "Your current 90-day goal, if you have one.",
    startInDays: 31,
    durationHours: 2,
    capacity: 15,
  },
];

export async function ensureSessionContentSeeded(): Promise<void> {
  const count = await prisma.sessionOffering.count();
  if (count > 0) return;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const rows = SESSION_TEMPLATES.flatMap((template) =>
    // Two upcoming instances of each template so "available session dates" (spec) has more than one option.
    [0, 1].map((i) => {
      const startsAt = new Date(now + (template.startInDays + i * 21) * dayMs);
      const endsAt = new Date(startsAt.getTime() + template.durationHours * 60 * 60 * 1000);
      return {
        sessionType: template.sessionType,
        title: template.title,
        description: template.description,
        whoShouldAttend: template.whoShouldAttend,
        topics: template.topics as never,
        learningOutcomes: template.learningOutcomes as never,
        whatYoullBuild: template.whatYoullBuild,
        whatToBring: template.whatToBring,
        status: "SCHEDULED" as const,
        format: "VIRTUAL" as const,
        startsAt,
        endsAt,
        timezone: "America/New_York",
        virtualLink: "https://meet.example.com/blueprint-session",
        capacity: template.capacity,
        priceCents: null,
      };
    }),
  );

  await prisma.sessionOffering.createMany({ data: rows });
}
